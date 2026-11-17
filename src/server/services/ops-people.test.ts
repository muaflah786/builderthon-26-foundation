import { resetTestDb, setupTestDb } from "@tests/helpers/db";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { canSetLevel } from "@/lib/ops/permissions";
import { suggestSetup } from "@/lib/ops/scenarios/engine";
import { PERMISSION_LEVELS } from "@/lib/ops/types";
import { db } from "@/server/db";
import { user } from "@/server/db/schema/auth";
import {
  actOnIssue,
  getCommandView,
  getFieldView,
  getShareInfo,
  joinOperation,
  launchOperation,
  reportIssue,
} from "@/server/services/ops";
import { closeOperation } from "@/server/services/ops-closure";
import { getPeople, renameRoles, updateMember } from "@/server/services/ops-people";
import type { SessionUser } from "@/types/auth";

async function makeUser(name: string, role: "user" | "admin" = "user"): Promise<SessionUser> {
  const id = crypto.randomUUID();
  await db.insert(user).values({ id, name, email: `${id}@example.com`, role });
  return { id, name, email: `${id}@example.com`, role, image: null };
}

/** Organizer, plus three people who joined team 0, and team 1 for moves. */
async function scenario() {
  const org = await makeUser("Olu");
  const a = await makeUser("Ann");
  const b = await makeUser("Ben");
  const c = await makeUser("Cat");
  const id = await launchOperation(org, suggestSetup({ situation: "Exam, 2 halls." }).draft);
  const { joinToken } = await getShareInfo(org, id);
  const teams = (await getCommandView(org, id)).teams;
  const ids: Record<string, string> = {};
  for (const [u, name] of [
    [a, "Ann"],
    [b, "Ben"],
    [c, "Cat"],
  ] as const) {
    ids[name] = (
      await joinOperation(u, { token: joinToken, displayName: name, teamId: teams[1].id })
    ).memberId;
  }
  const people = await getPeople(org, id);
  const orgMemberId = people.members.find((m) => m.level === "organizer")!.id;
  return { org, a, b, c, id, teams, ids, orgMemberId };
}

beforeAll(() => setupTestDb());
beforeEach(() => resetTestDb());

describe("people and roles", () => {
  it("organizer assigns team and role; changes are logged", async () => {
    const { org, id, teams, ids } = await scenario();
    const row = await updateMember(org, id, ids.Ann, { level: "lead", teamId: teams[2].id });
    expect(row).toMatchObject({ level: "lead", teamId: teams[2].id });
    const view = await getCommandView(org, id);
    expect(view.activity[0].summary).toMatch(/Ann is now .* and moved to/);
  });

  it("members and leads cannot open People or change anyone", async () => {
    const { org, a, b, id, ids } = await scenario();
    await expect(getPeople(a, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await updateMember(org, id, ids.Ann, { level: "lead" });
    await expect(updateMember(a, id, ids.Ben, { level: "lead" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(updateMember(b, id, ids.Ben, { level: "organizer" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("coordinators can only move people between member and lead", async () => {
    const { org, a, id, ids, orgMemberId } = await scenario();
    await updateMember(org, id, ids.Ann, { level: "coordinator" });
    await expect(updateMember(a, id, ids.Ben, { level: "lead" })).resolves.toMatchObject({
      level: "lead",
    });
    await expect(updateMember(a, id, ids.Cat, { level: "coordinator" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(updateMember(a, id, orgMemberId, { level: "member" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    // The permission helper agrees with the service for every combination.
    for (const level of PERMISSION_LEVELS) {
      expect(
        canSetLevel(
          { id: "x", level: "coordinator", teamId: null },
          { id: "y", level: "member" },
          level,
        ),
      ).toBe(level === "member" || level === "lead");
    }
  });

  it("never removes the last organizer, but allows handing over first", async () => {
    const { org, id, ids, orgMemberId } = await scenario();
    await expect(updateMember(org, id, orgMemberId, { level: "member" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    await updateMember(org, id, ids.Ann, { level: "organizer" });
    await expect(updateMember(org, id, orgMemberId, { level: "member" })).resolves.toMatchObject({
      level: "member",
    });
  });

  it("rejects a team from another operation", async () => {
    const { org, id, ids } = await scenario();
    const other = await launchOperation(org, suggestSetup({ situation: "Festival" }).draft);
    const foreignTeam = (await getCommandView(org, other)).teams[0].id;
    await expect(updateMember(org, id, ids.Ann, { teamId: foreignTeam })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("a team lead sees and resolves their own team's problems only", async () => {
    const { org, a, b, id, teams, ids } = await scenario();
    const issue = await reportIssue(b, id, { title: "Desk broken", severity: "urgent" });
    await expect(actOnIssue(a, id, issue.id, { action: "resolve" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    await updateMember(org, id, ids.Ann, { level: "lead" });
    const field = await getFieldView(a, id);
    expect(field.teamIssues.map((i) => i.title)).toEqual(["Desk broken"]);
    await actOnIssue(a, id, issue.id, { action: "acknowledge" });

    // Moved to another team: no longer responsible for it.
    await updateMember(org, id, ids.Ann, { teamId: teams[2].id });
    expect((await getFieldView(a, id)).teamIssues).toEqual([]);
    await expect(actOnIssue(a, id, issue.id, { action: "resolve" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("renaming roles changes labels only, never access", async () => {
    const { org, a, id, ids } = await scenario();
    await updateMember(org, id, ids.Ann, { level: "lead" });
    await renameRoles(org, id, {
      organizer: "Boss",
      coordinator: "Helper",
      lead: "Captain",
      member: "Crew",
    });
    const field = await getFieldView(a, id);
    expect(field.operation.config.roleLabels.lead).toBe("Captain");
    expect(field.member.level).toBe("lead");
    await expect(getPeople(a, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      renameRoles(a, id, { organizer: "x", coordinator: "x", lead: "x", member: "x" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("is read-only after closing", async () => {
    const { org, id, ids } = await scenario();
    await closeOperation(org, id, { unfinished: "leave" });
    await expect(updateMember(org, id, ids.Ann, { level: "lead" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
});
