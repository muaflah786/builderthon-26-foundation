import { resetTestDb, setupTestDb } from "@tests/helpers/db";
import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { canSeeTask } from "@/lib/ops/permissions";
import { suggestSetup } from "@/lib/ops/scenarios/engine";
import { listTasksQuerySchema } from "@/lib/validation/ops";
import { db } from "@/server/db";
import { user } from "@/server/db/schema/auth";
import { opsTasks } from "@/server/db/schema/ops";
import {
  actOnTask,
  getCommandView,
  getFieldView,
  getShareInfo,
  joinOperation,
  launchOperation,
} from "@/server/services/ops";
import { closeOperation } from "@/server/services/ops-closure";
import { getPeople, updateMember } from "@/server/services/ops-people";
import {
  createTask,
  getTask,
  getTaskFormOptions,
  listTasks,
  updateTask,
} from "@/server/services/ops-tasks";
import type { SessionUser } from "@/types/auth";

async function makeUser(name: string, role: "user" | "admin" = "user"): Promise<SessionUser> {
  const id = crypto.randomUUID();
  await db.insert(user).values({ id, name, email: `${id}@example.com`, role });
  return { id, name, email: `${id}@example.com`, role, image: null };
}

const q = (over: Record<string, unknown> = {}) => listTasksQuerySchema.parse(over);

/** Organizer; Ann (lead) and Ben (member) in hall A; Cat (member) in hall B. */
async function scenario() {
  const org = await makeUser("Olu");
  const ann = await makeUser("Ann");
  const ben = await makeUser("Ben");
  const cat = await makeUser("Cat");
  const id = await launchOperation(org, suggestSetup({ situation: "Exam, 2 halls." }).draft);
  const { joinToken } = await getShareInfo(org, id);
  const teams = (await getCommandView(org, id)).teams;
  const hallA = teams[1].id;
  const hallB = teams[2].id;
  const m: Record<string, string> = {};
  for (const [u, t] of [
    [ann, hallA],
    [ben, hallA],
    [cat, hallB],
  ] as const) {
    m[u.name] = (
      await joinOperation(u, { token: joinToken, displayName: u.name, teamId: t })
    ).memberId;
  }
  await updateMember(org, id, m.Ann, { level: "lead" });
  return { org, ann, ben, cat, id, hallA, hallB, m };
}

beforeAll(() => setupTestDb());
beforeEach(() => resetTestDb());

describe("task management after launch", () => {
  it("coordinator creates a team task; only that team's members see it", async () => {
    const { org, ben, cat, id, hallA } = await scenario();
    const task = await createTask(org, id, {
      title: "Bring extra answer sheets",
      teamId: hallA,
      priority: "high",
    });
    expect(task).toMatchObject({ status: "todo", teamId: hallA, priority: "high" });

    expect((await getFieldView(ben, id)).availableTasks.map((t) => t.id)).toContain(task.id);
    expect((await getFieldView(cat, id)).availableTasks.map((t) => t.id)).not.toContain(task.id);
    await expect(getTask(cat, id, task.id)).rejects.toMatchObject({ code: "NOT_FOUND" });

    const detail = await getTask(org, id, task.id);
    expect(detail.history[0].summary).toMatch(/created "Bring extra answer sheets"/);
    expect(detail.task.createdByName).toBe("Olu");
  });

  it("a task assigned to a person is visible only to them (and leads/coordinators)", async () => {
    const { org, ann, ben, id, hallA, m } = await scenario();
    const task = await createTask(org, id, {
      title: "Escort late candidate",
      teamId: hallA,
      assigneeMemberId: m.Ben,
      priority: "normal",
    });
    const benView = await getFieldView(ben, id);
    expect(benView.activeTasks.map((t) => t.id)).toContain(task.id);
    expect(benView.availableTasks.map((t) => t.id)).not.toContain(task.id);
    await expect(getTask(ann, id, task.id)).resolves.toBeTruthy(); // lead of hall A
    // Ann (lead) cannot start someone else's assigned task.
    await expect(actOnTask(ann, id, task.id, { action: "start" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await actOnTask(ben, id, task.id, { action: "start" });
    const done = await actOnTask(ben, id, task.id, { action: "complete" });
    expect(done.completedByMemberId).toBe(m.Ben);
  });

  it("leads create and edit only for their own team; members can't create", async () => {
    const { ann, ben, id, hallA, hallB, m } = await scenario();
    const own = await createTask(ann, id, {
      title: "Seat check",
      teamId: hallA,
      priority: "normal",
    });
    expect(own.teamId).toBe(hallA);
    await expect(
      createTask(ann, id, { title: "x", teamId: hallB, priority: "normal" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      createTask(ann, id, { title: "x", teamId: null, priority: "normal" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      createTask(ann, id, {
        title: "x",
        teamId: hallA,
        assigneeMemberId: m.Cat,
        priority: "normal",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      createTask(ben, id, { title: "x", teamId: hallA, priority: "normal" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(getTaskFormOptions(ben, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(listTasks(ben, id, q())).rejects.toMatchObject({ code: "NOT_FOUND" });

    const lead = await listTasks(ann, id, q());
    expect(lead.rows.every((t) => t.teamId === hallA || t.assigneeMemberId === m.Ann)).toBe(true);
    expect(lead.rows.some((t) => t.id === own.id)).toBe(true);
  });

  it("rejects ids from another operation", async () => {
    const { org, id } = await scenario();
    const other = await launchOperation(org, suggestSetup({ situation: "Festival" }).draft);
    const otherPeople = await getPeople(org, other);
    const otherTeam = (await getCommandView(org, other)).teams[0].id;
    await expect(
      createTask(org, id, { title: "x", teamId: otherTeam, priority: "normal" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      createTask(org, id, {
        title: "x",
        assigneeMemberId: otherPeople.members[0].id,
        priority: "normal",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("reassigning resets to waiting, moving teams clears an outside person, history records it", async () => {
    const { org, ben, id, hallA, hallB, m } = await scenario();
    const task = await createTask(org, id, {
      title: "Collect papers",
      teamId: hallA,
      assigneeMemberId: m.Ben,
      priority: "normal",
    });
    await actOnTask(ben, id, task.id, { action: "start" });
    const started = (await db.select().from(opsTasks).where(eq(opsTasks.id, task.id)))[0];

    const moved = await updateTask(org, id, task.id, {
      teamId: hallB,
      expectedVersion: started.version,
    });
    expect(moved).toMatchObject({ teamId: hallB, assigneeMemberId: null, status: "todo" });
    // Ben (hall A) no longer sees it at all.
    await expect(getTask(ben, id, task.id)).rejects.toMatchObject({ code: "NOT_FOUND" });

    const detail = await getTask(org, id, task.id);
    expect(detail.history[0].summary).toMatch(/changed the team, person/);
    expect(detail.history[0].data).toMatchObject({ teamId: { from: hallA, to: hallB } });
  });

  it("refuses stale edits and edits to finished tasks", async () => {
    const { org, ben, id, hallA } = await scenario();
    const task = await createTask(org, id, { title: "A", teamId: hallA, priority: "normal" });
    await updateTask(org, id, task.id, { title: "B", expectedVersion: task.version });
    await expect(
      updateTask(org, id, task.id, { title: "C", expectedVersion: task.version }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    await actOnTask(ben, id, task.id, { action: "start" });
    await actOnTask(ben, id, task.id, { action: "complete" });
    await expect(
      updateTask(org, id, task.id, { title: "D", expectedVersion: 99 }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("filters the overview by state, team and search, with counts", async () => {
    const { org, id, hallA } = await scenario();
    await createTask(org, id, {
      title: "Overdue thing",
      teamId: hallA,
      priority: "normal",
      dueAt: new Date(Date.now() - 3600_000).toISOString(),
    });
    const late = await listTasks(org, id, q({ state: "late" }));
    expect(late.rows.map((r) => r.title)).toEqual(["Overdue thing"]);
    expect(late.counts.late).toBe(1);
    const search = await listTasks(org, id, q({ q: "overdue", teamId: hallA }));
    expect(search.total).toBe(1);
  });

  it("is read-only after closing", async () => {
    const { org, id, hallA } = await scenario();
    await closeOperation(org, id, { unfinished: "leave" });
    await expect(
      createTask(org, id, { title: "x", teamId: hallA, priority: "normal" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("canSeeTask visibility rule", () => {
  const lead = { id: "L", level: "lead" as const, teamId: "A" };
  const member = { id: "M", level: "member" as const, teamId: "A" };
  it.each([
    [member, { teamId: "A", assigneeMemberId: null, status: "todo" }, true],
    [member, { teamId: "A", assigneeMemberId: null, status: "in_progress" }, false],
    [member, { teamId: "A", assigneeMemberId: "X", status: "todo" }, false],
    [member, { teamId: "B", assigneeMemberId: null, status: "todo" }, false],
    [member, { teamId: "B", assigneeMemberId: "M", status: "in_progress" }, true],
    [lead, { teamId: "A", assigneeMemberId: "X", status: "in_progress" }, true],
    [lead, { teamId: "B", assigneeMemberId: null, status: "todo" }, false],
  ])("%o sees %o → %s", (m, task, expected) => {
    expect(canSeeTask(m, task)).toBe(expected);
  });
});
