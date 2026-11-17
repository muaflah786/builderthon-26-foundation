import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  lt,
  ne,
  notInArray,
  or,
  type SQL,
} from "drizzle-orm";
import { AppError } from "@/lib/errors";
import {
  atLeast,
  canCreateTaskFor,
  canEditTask,
  canSeeTask,
  canStartTask,
  canFinishTask,
  canViewTaskList,
  type MemberRef,
} from "@/lib/ops/permissions";
import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from "@/lib/validation/ops";
import { containsInsensitive } from "@/server/db/query-helpers";
import { db } from "@/server/db";
import {
  opsActivity,
  opsLocations,
  opsMembers,
  opsTasks,
  opsTeams,
  type OpsMember,
  type OpsTask,
} from "@/server/db/schema/ops";
import { logActivity, memberRef, requireMember } from "@/server/services/ops";
import type { SessionUser } from "@/types/auth";

/**
 * Task Management 2.0 (stage T2-B): create, edit and assign tasks after launch,
 * the task overview and task details with history. Every read goes through the
 * single visibility rule (`canSeeTask` / `visibleTasksWhere`).
 */

export const TASK_PAGE_SIZE = 25;
const OPEN = ["todo", "in_progress", "blocked"] as const;

/** SQL form of `canSeeTask`, so lists never load rows the member may not see. */
function visibleTasksWhere(m: MemberRef): SQL | undefined {
  if (atLeast(m, "coordinator")) return undefined;
  const mine = eq(opsTasks.assigneeMemberId, m.id);
  if (m.level === "lead") {
    return m.teamId ? or(mine, eq(opsTasks.teamId, m.teamId)) : mine;
  }
  return or(
    mine,
    and(
      eq(opsTasks.status, "todo"),
      isNull(opsTasks.assigneeMemberId),
      m.teamId ? eq(opsTasks.teamId, m.teamId) : isNull(opsTasks.teamId),
    ),
  );
}

/** Teams, people and places for pickers, limited to what this editor may assign. */
async function pickers(operationId: string, m: MemberRef) {
  const teamsAll = await db
    .select({ id: opsTeams.id, name: opsTeams.name })
    .from(opsTeams)
    .where(and(eq(opsTeams.operationId, operationId), isNull(opsTeams.archivedAt)))
    .orderBy(asc(opsTeams.createdAt));
  const teams = teamsAll.filter((t) => canCreateTaskFor(m, t.id));
  const people = await db
    .select({ id: opsMembers.id, name: opsMembers.displayName, teamId: opsMembers.teamId })
    .from(opsMembers)
    .where(eq(opsMembers.operationId, operationId))
    .orderBy(asc(opsMembers.displayName));
  const locations = await db
    .select({ id: opsLocations.id, name: opsLocations.name })
    .from(opsLocations)
    .where(eq(opsLocations.operationId, operationId))
    .orderBy(asc(opsLocations.createdAt));
  return {
    teams,
    // Leads may only assign people in their own team.
    people: atLeast(m, "coordinator") ? people : people.filter((p) => p.teamId === m.teamId),
    locations,
    allowNoTeam: canCreateTaskFor(m, null),
  };
}

// ---------------------------------------------------------------- reads

export async function listTasks(
  user: SessionUser,
  operationId: string,
  query: ListTasksQuery,
  now = new Date(),
) {
  const { operation, member } = await requireMember(user, operationId);
  const m = memberRef(member);
  if (!canViewTaskList(m)) throw AppError.notFound("Operation");

  const scope = and(eq(opsTasks.operationId, operationId), visibleTasksWhere(m));
  const stateWhere: Record<ListTasksQuery["state"], SQL | undefined> = {
    all: ne(opsTasks.status, "cancelled"),
    todo: eq(opsTasks.status, "todo"),
    in_progress: inArray(opsTasks.status, ["in_progress", "blocked"]),
    late: and(inArray(opsTasks.status, [...OPEN]), lt(opsTasks.dueAt, now)),
    done: eq(opsTasks.status, "done"),
  };
  const where = and(
    scope,
    stateWhere[query.state],
    query.teamId ? eq(opsTasks.teamId, query.teamId) : undefined,
    query.q ? containsInsensitive(opsTasks.title, query.q) : undefined,
  );

  const rows = await db
    .select({
      task: opsTasks,
      teamName: opsTeams.name,
      teamArchived: opsTeams.archivedAt,
      assigneeName: opsMembers.displayName,
      locationName: opsLocations.name,
    })
    .from(opsTasks)
    .leftJoin(opsTeams, eq(opsTeams.id, opsTasks.teamId))
    .leftJoin(opsMembers, eq(opsMembers.id, opsTasks.assigneeMemberId))
    .leftJoin(opsLocations, eq(opsLocations.id, opsTasks.locationId))
    .where(where)
    .orderBy(asc(opsTasks.dueAt), asc(opsTasks.createdAt), asc(opsTasks.id))
    .limit(TASK_PAGE_SIZE)
    .offset((query.page - 1) * TASK_PAGE_SIZE);
  const [{ total }] = await db.select({ total: count() }).from(opsTasks).where(where);

  // Counts per filter (within the member's scope) for the segmented control.
  const scoped = await db
    .select({ status: opsTasks.status, dueAt: opsTasks.dueAt })
    .from(opsTasks)
    .where(and(scope, query.teamId ? eq(opsTasks.teamId, query.teamId) : undefined));
  const counts = {
    all: scoped.filter((t) => t.status !== "cancelled").length,
    todo: scoped.filter((t) => t.status === "todo").length,
    in_progress: scoped.filter((t) => t.status === "in_progress" || t.status === "blocked").length,
    late: scoped.filter(
      (t) => (OPEN as readonly string[]).includes(t.status) && t.dueAt !== null && t.dueAt < now,
    ).length,
    done: scoped.filter((t) => t.status === "done").length,
  };

  const teams = await db
    .select({ id: opsTeams.id, name: opsTeams.name })
    .from(opsTeams)
    .where(and(eq(opsTeams.operationId, operationId), isNull(opsTeams.archivedAt)))
    .orderBy(asc(opsTeams.createdAt));

  return {
    operation: {
      id: operation.id,
      name: operation.name,
      status: operation.status,
      config: operation.config,
    },
    me: m,
    rows: rows.map((r) => ({
      ...r.task,
      teamName: r.teamName,
      teamArchived: r.teamArchived !== null,
      assigneeName: r.assigneeName,
      locationName: r.locationName,
      late:
        (OPEN as readonly string[]).includes(r.task.status) &&
        r.task.dueAt !== null &&
        r.task.dueAt < now,
    })),
    total,
    pageSize: TASK_PAGE_SIZE,
    counts,
    // Leads only filter within what they can see; the team filter shows their own team.
    teams: atLeast(m, "coordinator") ? teams : teams.filter((t) => t.id === m.teamId),
    canCreate:
      operation.status === "live" &&
      (canCreateTaskFor(m, null) || (m.teamId !== null && canCreateTaskFor(m, m.teamId))),
  };
}

async function findVisibleTask(
  operationId: string,
  m: MemberRef,
  taskId: string,
): Promise<OpsTask> {
  const [task] = await db
    .select()
    .from(opsTasks)
    .where(and(eq(opsTasks.id, taskId), eq(opsTasks.operationId, operationId)));
  if (!task || !canSeeTask(m, task)) throw AppError.notFound("Task");
  return task;
}

export async function getTask(
  user: SessionUser,
  operationId: string,
  taskId: string,
  now = new Date(),
) {
  const { operation, member } = await requireMember(user, operationId);
  const m = memberRef(member);
  const task = await findVisibleTask(operationId, m, taskId);

  const names = async (id: string | null, table: "team" | "member" | "location") => {
    if (!id) return null;
    if (table === "team") {
      const [r] = await db
        .select({ name: opsTeams.name, archivedAt: opsTeams.archivedAt })
        .from(opsTeams)
        .where(eq(opsTeams.id, id));
      return r ? `${r.name}${r.archivedAt ? " (removed)" : ""}` : null;
    }
    if (table === "member") {
      const [r] = await db
        .select({ name: opsMembers.displayName })
        .from(opsMembers)
        .where(eq(opsMembers.id, id));
      return r?.name ?? null;
    }
    const [r] = await db
      .select({ name: opsLocations.name })
      .from(opsLocations)
      .where(eq(opsLocations.id, id));
    return r?.name ?? null;
  };

  const history = await db
    .select({ entry: opsActivity, actorName: opsMembers.displayName })
    .from(opsActivity)
    .leftJoin(opsMembers, eq(opsMembers.id, opsActivity.actorMemberId))
    .where(and(eq(opsActivity.operationId, operationId), eq(opsActivity.entityId, task.id)))
    .orderBy(desc(opsActivity.createdAt));

  const live = operation.status === "live";
  return {
    operation: {
      id: operation.id,
      name: operation.name,
      status: operation.status,
      config: operation.config,
    },
    me: m,
    task: {
      ...task,
      teamName: await names(task.teamId, "team"),
      assigneeName: await names(task.assigneeMemberId, "member"),
      locationName: await names(task.locationId, "location"),
      createdByName: await names(task.createdByMemberId, "member"),
      completedByName: await names(task.completedByMemberId, "member"),
      late:
        (OPEN as readonly string[]).includes(task.status) &&
        task.dueAt !== null &&
        task.dueAt < now,
    },
    canEdit: live && (OPEN as readonly string[]).includes(task.status) && canEditTask(m, task),
    canStart: live && task.status === "todo" && canStartTask(m, task),
    canFinish: live && task.status === "in_progress" && canFinishTask(m, task),
    canViewList: canViewTaskList(m),
    history: history.map((h) => ({ ...h.entry, actorName: h.actorName })),
  };
}

/** Data for the create/edit form: what this person may choose from. */
export async function getTaskFormOptions(user: SessionUser, operationId: string, taskId?: string) {
  const { operation, member } = await requireMember(user, operationId);
  const m = memberRef(member);
  if (operation.status !== "live") throw AppError.conflict("This operation is closed.");
  let task: OpsTask | null = null;
  if (taskId) {
    task = await findVisibleTask(operationId, m, taskId);
    if (!canEditTask(m, task)) throw AppError.notFound("Task");
  } else if (!canCreateTaskFor(m, null) && !(m.teamId && canCreateTaskFor(m, m.teamId))) {
    throw AppError.notFound("Operation");
  }
  return {
    operation: { id: operation.id, name: operation.name, config: operation.config },
    me: m,
    task,
    ...(await pickers(operationId, m)),
  };
}

// ---------------------------------------------------------------- writes

type Refs = { teamId: string | null; assigneeMemberId: string | null; locationId: string | null };

/** Checks every referenced id belongs to this operation and is assignable by `m`. */
async function validateRefs(
  operationId: string,
  m: MemberRef,
  refs: Refs,
): Promise<OpsMember | null> {
  if (refs.teamId) {
    const [team] = await db
      .select({ id: opsTeams.id, archivedAt: opsTeams.archivedAt })
      .from(opsTeams)
      .where(and(eq(opsTeams.id, refs.teamId), eq(opsTeams.operationId, operationId)));
    if (!team || team.archivedAt)
      throw AppError.validation({ teamId: ["Choose one of the listed teams"] });
  }
  if (!canCreateTaskFor(m, refs.teamId)) {
    throw AppError.forbidden("You can only create and change tasks for your own team.");
  }
  let assignee: OpsMember | null = null;
  if (refs.assigneeMemberId) {
    const [row] = await db
      .select()
      .from(opsMembers)
      .where(
        and(eq(opsMembers.id, refs.assigneeMemberId), eq(opsMembers.operationId, operationId)),
      );
    if (!row) throw AppError.validation({ assigneeMemberId: ["Choose one of the listed people"] });
    if (!atLeast(m, "coordinator") && row.teamId !== m.teamId) {
      throw AppError.validation({
        assigneeMemberId: ["You can only assign people in your own team"],
      });
    }
    assignee = row;
  }
  if (refs.locationId) {
    const [loc] = await db
      .select({ id: opsLocations.id })
      .from(opsLocations)
      .where(and(eq(opsLocations.id, refs.locationId), eq(opsLocations.operationId, operationId)));
    if (!loc) throw AppError.validation({ locationId: ["Choose one of the listed places"] });
  }
  return assignee;
}

export async function createTask(
  user: SessionUser,
  operationId: string,
  input: CreateTaskInput,
): Promise<OpsTask> {
  const { operation, member } = await requireMember(user, operationId);
  if (operation.status !== "live") throw AppError.conflict("This operation is closed.");
  const m = memberRef(member);

  // With a person but no team, the task belongs to that person's team.
  let teamId = input.teamId ?? null;
  if (!teamId && input.assigneeMemberId && !atLeast(m, "coordinator")) teamId = m.teamId;
  const refs: Refs = {
    teamId,
    assigneeMemberId: input.assigneeMemberId ?? null,
    locationId: input.locationId ?? null,
  };
  const assignee = await validateRefs(operationId, m, refs);
  if (!refs.teamId && assignee?.teamId) refs.teamId = assignee.teamId;

  return db.transaction(async (tx) => {
    const [task] = await tx
      .insert(opsTasks)
      .values({
        operationId,
        title: input.title,
        instructions: input.instructions ?? null,
        priority: input.priority,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        createdByMemberId: member.id,
        ...refs,
      })
      .returning();
    const to = assignee ? ` for ${assignee.displayName}` : "";
    await logActivity(
      tx,
      operationId,
      member,
      "task",
      task.id,
      "created",
      `${member.displayName} created "${task.title}"${to}`,
      {
        teamId: refs.teamId,
        assigneeMemberId: refs.assigneeMemberId,
      },
    );
    return task;
  });
}

export async function updateTask(
  user: SessionUser,
  operationId: string,
  taskId: string,
  input: UpdateTaskInput,
): Promise<OpsTask> {
  const { operation, member } = await requireMember(user, operationId);
  if (operation.status !== "live") throw AppError.conflict("This operation is closed.");
  const m = memberRef(member);
  const task = await findVisibleTask(operationId, m, taskId);
  if (!canEditTask(m, task)) throw AppError.forbidden("You can't change this task.");
  if (!(OPEN as readonly string[]).includes(task.status)) {
    throw AppError.conflict("Finished or cancelled tasks can't be changed.");
  }
  if (task.version !== input.expectedVersion) {
    throw AppError.conflict("Someone changed this task just now. Reload to see their changes.");
  }

  const refs: Refs = {
    teamId: input.teamId !== undefined ? input.teamId : task.teamId,
    assigneeMemberId:
      input.assigneeMemberId !== undefined ? input.assigneeMemberId : task.assigneeMemberId,
    locationId: input.locationId !== undefined ? input.locationId : task.locationId,
  };
  const assignee = await validateRefs(operationId, m, refs);

  const changes: string[] = [];
  const data: Record<string, { from: unknown; to: unknown }> = {};
  const values: Partial<OpsTask> = {};
  const set = <K extends keyof OpsTask>(key: K, value: OpsTask[K], label: string) => {
    const before = task[key];
    const same =
      before instanceof Date && value instanceof Date
        ? before.getTime() === value.getTime()
        : before === value;
    if (same) return;
    values[key] = value;
    data[key] = { from: before, to: value };
    changes.push(label);
  };

  if (input.title !== undefined) set("title", input.title, "name");
  if (input.instructions !== undefined)
    set("instructions", input.instructions ?? null, "instructions");
  if (input.priority !== undefined) set("priority", input.priority, "priority");
  if (input.dueAt !== undefined)
    set("dueAt", input.dueAt ? new Date(input.dueAt) : null, "due time");
  set("locationId", refs.locationId, "place");
  set("teamId", refs.teamId, "team");

  // Moving to another team clears a person who isn't in it (D3: no leaking across teams).
  let assigneeId = refs.assigneeMemberId;
  if (values.teamId !== undefined && assignee && assignee.teamId !== refs.teamId) assigneeId = null;
  set("assigneeMemberId", assigneeId, "person");

  // A new (or no) person means the work starts again from "waiting".
  if (values.assigneeMemberId !== undefined && task.status !== "todo") {
    values.status = "todo";
    values.startedAt = null;
  }

  if (changes.length === 0) return task;

  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(opsTasks)
      .set({ ...values, version: task.version + 1 })
      .where(and(eq(opsTasks.id, task.id), eq(opsTasks.version, task.version)))
      .returning();
    if (!row)
      throw AppError.conflict("Someone changed this task just now. Reload to see their changes.");
    await logActivity(
      tx,
      operationId,
      member,
      "task",
      task.id,
      "edited",
      `${member.displayName} changed the ${changes.join(", ")} of "${row.title}"`,
      data,
    );
    return row;
  });
}

/** Ids of open tasks: used by tests and future team moves. */
export async function openTaskIdsForTeam(operationId: string, teamId: string) {
  const rows = await db
    .select({ id: opsTasks.id })
    .from(opsTasks)
    .where(
      and(
        eq(opsTasks.operationId, operationId),
        eq(opsTasks.teamId, teamId),
        notInArray(opsTasks.status, ["done", "cancelled"]),
      ),
    );
  return rows.map((r) => r.id);
}
