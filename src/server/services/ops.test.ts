import { setupTestDb, resetTestDb } from "@tests/helpers/db";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { suggestSetup } from "@/lib/ops/scenarios/engine";
import { db } from "@/server/db";
import { user } from "@/server/db/schema/auth";
import { opsActivity, opsMembers, opsTasks } from "@/server/db/schema/ops";
import {
  actOnIssue,
  actOnTask,
  changeJoinLink,
  getCommandView,
  getFieldView,
  getShareInfo,
  joinOperation,
  launchOperation,
  reportIssue,
} from "@/server/services/ops";
import type { SessionUser } from "@/types/auth";
import { and, eq } from "drizzle-orm";

async function makeUser(name: string, role: "user" | "admin" = "user"): Promise<SessionUser> {
  const id = crypto.randomUUID();
  await db.insert(user).values({ id, name, email: `${id}@example.com`, role });
  return { id, name, email: `${id}@example.com`, role, image: null };
}

const EXAM = "University exam today. 2 halls, 10 invigilators.";

async function launch(organizer: SessionUser, situation = EXAM) {
  const s = suggestSetup({
    situation,
    startsAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
  });
  const id = await launchOperation(organizer, s.draft);
  const { joinToken } = await getShareInfo(organizer, id);
  return { id, joinToken };
}

beforeAll(() => setupTestDb());
beforeEach(() => resetTestDb());

describe("operations service", () => {
  it("launches an operation with the organizer as its only member", async () => {
    const org = await makeUser("Olu");
    const { id } = await launch(org);
    const view = await getCommandView(org, id);
    expect(view.counts.total).toBeGreaterThan(0);
    expect(view.counts.people).toBe(1);
    expect(view.member.level).toBe("organizer");
    expect(view.operation.config.roleLabels.organizer).toBeTruthy();
  });

  it("isolates operations: non-members and global admins get 404", async () => {
    const org = await makeUser("Olu");
    const admin = await makeUser("Ada", "admin");
    const stranger = await makeUser("Sam");
    const { id } = await launch(org);
    for (const u of [admin, stranger]) {
      await expect(getFieldView(u, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(getCommandView(u, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(reportIssue(u, id, { title: "x", severity: "normal" })).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    }
  });

  it("joins as member only, once, and members cannot see the command centre", async () => {
    const org = await makeUser("Olu");
    const vol = await makeUser("Vee");
    const { id, joinToken } = await launch(org);
    const first = await joinOperation(vol, { token: joinToken, displayName: "Vee" });
    const again = await joinOperation(vol, { token: joinToken, displayName: "Vee" });
    expect(again.memberId).toBe(first.memberId);
    const rows = await db
      .select()
      .from(opsMembers)
      .where(and(eq(opsMembers.operationId, id), eq(opsMembers.userId, vol.id)));
    expect(rows).toHaveLength(1);
    expect(rows[0].level).toBe("member");
    await expect(getCommandView(vol, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(getShareInfo(vol, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("refuses joining through a disabled or replaced link", async () => {
    const org = await makeUser("Olu");
    const vol = await makeUser("Vee");
    const { id, joinToken } = await launch(org);
    await changeJoinLink(org, id, "disable");
    await expect(
      joinOperation(vol, { token: joinToken, displayName: "Vee" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await changeJoinLink(org, id, "rotate");
    await expect(
      joinOperation(vol, { token: joinToken, displayName: "Vee" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("runs a task from claim to completion and records history", async () => {
    const org = await makeUser("Olu");
    const vol = await makeUser("Vee");
    const other = await makeUser("Ot");
    const { id, joinToken } = await launch(org);
    const teamId = (await getCommandView(org, id)).teams[1].id;
    await joinOperation(vol, { token: joinToken, displayName: "Vee", teamId });
    await joinOperation(other, { token: joinToken, displayName: "Ot", teamId });

    const field = await getFieldView(vol, id);
    expect(field.team?.id).toBe(teamId);
    const task = field.availableTasks[0];
    expect(task).toBeDefined();

    await actOnTask(vol, id, task.id, { action: "start" });
    // Someone else can no longer take or finish it.
    await expect(actOnTask(other, id, task.id, { action: "start" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(actOnTask(other, id, task.id, { action: "complete" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    const done = await actOnTask(vol, id, task.id, { action: "complete", note: "All set" });
    expect(done.status).toBe("done");
    expect(done.version).toBe(3);

    const log = await db.select().from(opsActivity).where(eq(opsActivity.operationId, id));
    expect(log.map((l) => l.action)).toEqual(
      expect.arrayContaining(["launched", "joined", "start", "complete"]),
    );
  });

  it("cannot start a task from another team", async () => {
    const org = await makeUser("Olu");
    const vol = await makeUser("Vee");
    const { id, joinToken } = await launch(org);
    const teams = (await getCommandView(org, id)).teams;
    await joinOperation(vol, { token: joinToken, displayName: "Vee", teamId: teams[0].id });
    const [foreign] = await db
      .select()
      .from(opsTasks)
      .where(and(eq(opsTasks.operationId, id), eq(opsTasks.teamId, teams[1].id)));
    await expect(actOnTask(vol, id, foreign.id, { action: "start" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("shows reported problems and late tasks to the coordinator, and only they can resolve", async () => {
    const org = await makeUser("Olu");
    const vol = await makeUser("Vee");
    const { id, joinToken } = await launch(org);
    await joinOperation(vol, { token: joinToken, displayName: "Vee" });
    const issue = await reportIssue(vol, id, { title: "Paper packet missing", severity: "urgent" });

    const view = await getCommandView(org, id);
    expect(view.attention.urgent_issues.count).toBe(1);
    // Started 3 hours ago: early tasks are already late.
    expect(view.counts.delayed).toBeGreaterThan(0);

    await expect(actOnIssue(vol, id, issue.id, { action: "resolve" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await actOnIssue(org, id, issue.id, { action: "acknowledge" });
    const resolved = await actOnIssue(org, id, issue.id, { action: "resolve", note: "Found it" });
    expect(resolved.status).toBe("resolved");
    expect((await getCommandView(org, id)).attention.urgent_issues.count).toBe(0);
  });

  it("rejects a launch whose tasks point to a removed team", async () => {
    const org = await makeUser("Olu");
    const s = suggestSetup({ situation: EXAM });
    const draft = { ...s.draft, teams: s.draft.teams.slice(1) };
    await expect(launchOperation(org, draft)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
