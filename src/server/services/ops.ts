import "server-only";

import { and, asc, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { AppError } from "@/lib/errors";
import {
  canFinishTask,
  canHandleIssue,
  canShareLink,
  canStartTask,
  canViewCommand,
  type MemberRef,
} from "@/lib/ops/permissions";
import { setupDraftSchema, type SetupDraftInput } from "@/lib/ops/setup";
import type { AttentionSignal, OpsConfig, PermissionLevel } from "@/lib/ops/types";
import type {
  IssueActionInput,
  JoinOperationInput,
  ReportIssueInput,
  TaskActionInput,
} from "@/lib/validation/ops";
import { db } from "@/server/db";
import { user as userTable } from "@/server/db/schema/auth";
import {
  operations,
  opsActivity,
  opsIssues,
  opsLocations,
  opsMembers,
  opsTasks,
  opsTeams,
  type Operation,
  type OpsIssue,
  type OpsMember,
  type OpsTask,
} from "@/server/db/schema/ops";
import type { SessionUser } from "@/types/auth";

/**
 * Universal operations service. Every function takes the signed-in user and an
 * operation id and starts with `requireMember`, which is the ONLY gate:
 * non-members (global admins included) get 404, so ids leak nothing.
 * No code here knows which kind of situation an operation is.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type Db = typeof db | Tx;

// ---------------------------------------------------------------- access

export async function requireMember(
  user: SessionUser,
  operationId: string,
): Promise<{ operation: Operation; member: OpsMember }> {
  // Deliberately ignores user.role: global admins have no automatic access.
  const [row] = await db
    .select({ operation: operations, member: opsMembers })
    .from(opsMembers)
    .innerJoin(operations, eq(operations.id, opsMembers.operationId))
    .where(and(eq(opsMembers.operationId, operationId), eq(opsMembers.userId, user.id)));
  if (!row) throw AppError.notFound("Operation");
  return row;
}

const ref = (m: OpsMember): MemberRef => ({ id: m.id, level: m.level, teamId: m.teamId });

function requireLive(op: Operation) {
  if (op.status !== "live") throw AppError.conflict("This operation is closed.");
}

async function log(
  tx: Db,
  operationId: string,
  actor: OpsMember | null,
  entityType: string,
  entityId: string,
  action: string,
  summary: string,
  data?: Record<string, unknown>,
) {
  await tx.insert(opsActivity).values({
    operationId,
    actorMemberId: actor?.id ?? null,
    entityType,
    entityId,
    action,
    summary,
    data: data ?? null,
  });
}

function newJoinToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(18)); // 144 bits
  return Buffer.from(bytes).toString("base64url");
}

// ---------------------------------------------------------------- launch

/** Creates an operation from a reviewed setup in one transaction. Returns its id. */
export async function launchOperation(user: SessionUser, input: SetupDraftInput): Promise<string> {
  const draft = setupDraftSchema.parse(input);

  const locationKeys = new Set(draft.locations.map((l) => l.key));
  const teamKeys = new Set(draft.teams.map((t) => t.key));
  const badRef = (k: string | undefined, keys: Set<string>) => k !== undefined && !keys.has(k);
  if (
    draft.teams.some((t) => badRef(t.locationKey, locationKeys)) ||
    draft.tasks.some((t) => badRef(t.teamKey, teamKeys) || badRef(t.locationKey, locationKeys))
  ) {
    throw AppError.badRequest("The setup refers to a team or place that no longer exists.");
  }

  const startsAt = draft.startsAt ? new Date(draft.startsAt) : null;

  return db.transaction(async (tx) => {
    const [op] = await tx
      .insert(operations)
      .values({
        name: draft.name,
        situation: draft.situation,
        templateId: draft.templateId,
        config: draft.config,
        startsAt,
        joinToken: newJoinToken(),
        createdBy: user.id,
      })
      .returning();

    const locationIds = new Map<string, string>();
    for (const l of draft.locations) {
      const [row] = await tx
        .insert(opsLocations)
        .values({ operationId: op.id, name: l.name, directions: l.directions ?? null })
        .returning({ id: opsLocations.id });
      locationIds.set(l.key, row.id);
    }

    const teamIds = new Map<string, string>();
    for (const t of draft.teams) {
      const [row] = await tx
        .insert(opsTeams)
        .values({
          operationId: op.id,
          name: t.name,
          purpose: t.purpose ?? null,
          locationId: t.locationKey ? locationIds.get(t.locationKey)! : null,
        })
        .returning({ id: opsTeams.id });
      teamIds.set(t.key, row.id);
    }

    if (draft.tasks.length > 0) {
      await tx.insert(opsTasks).values(
        draft.tasks.map((t) => ({
          operationId: op.id,
          title: t.title,
          instructions: t.instructions ?? null,
          category: t.category ?? null,
          priority: t.priority,
          teamId: t.teamKey ? teamIds.get(t.teamKey)! : null,
          locationId: t.locationKey ? locationIds.get(t.locationKey)! : null,
          dueAt:
            startsAt && t.offsetMinutes !== undefined
              ? new Date(startsAt.getTime() + t.offsetMinutes * 60_000)
              : null,
        })),
      );
    }

    const [organizer] = await tx
      .insert(opsMembers)
      .values({ operationId: op.id, userId: user.id, displayName: user.name, level: "organizer" })
      .returning();
    await log(
      tx,
      op.id,
      organizer,
      "operation",
      op.id,
      "launched",
      `${user.name} launched the operation`,
    );
    return op.id;
  });
}

// ---------------------------------------------------------------- listing

export async function listMyOperations(user: SessionUser) {
  return db
    .select({
      id: operations.id,
      name: operations.name,
      status: operations.status,
      startsAt: operations.startsAt,
      config: operations.config,
      level: opsMembers.level,
      createdAt: operations.createdAt,
    })
    .from(opsMembers)
    .innerJoin(operations, eq(operations.id, opsMembers.operationId))
    .where(eq(opsMembers.userId, user.id))
    .orderBy(desc(operations.createdAt));
}

// ---------------------------------------------------------------- joining

/** Public information shown on the join page. Only reachable with the token. */
export async function getJoinInfo(token: string) {
  const [op] = await db.select().from(operations).where(eq(operations.joinToken, token));
  if (!op) return null;
  const [organizer] = await db
    .select({ name: userTable.name })
    .from(userTable)
    .where(eq(userTable.id, op.createdBy));
  const teams = await db
    .select({ id: opsTeams.id, name: opsTeams.name, purpose: opsTeams.purpose })
    .from(opsTeams)
    .where(eq(opsTeams.operationId, op.id))
    .orderBy(asc(opsTeams.createdAt));
  return {
    id: op.id,
    name: op.name,
    startsAt: op.startsAt,
    open: op.status === "live" && op.joinEnabled,
    organizerName: organizer?.name ?? "",
    config: op.config,
    teams,
  };
}

export async function joinOperation(user: SessionUser, input: JoinOperationInput) {
  const [op] = await db.select().from(operations).where(eq(operations.joinToken, input.token));
  if (!op) throw AppError.notFound("Invite link");

  const [existing] = await db
    .select()
    .from(opsMembers)
    .where(and(eq(opsMembers.operationId, op.id), eq(opsMembers.userId, user.id)));
  if (existing) return { operationId: op.id, memberId: existing.id, alreadyMember: true };

  if (op.status !== "live" || !op.joinEnabled) {
    throw AppError.forbidden(
      "This invite link is no longer active. Ask the organizer for a new one.",
    );
  }

  let teamId: string | null = null;
  if (input.teamId) {
    const [team] = await db
      .select({ id: opsTeams.id })
      .from(opsTeams)
      .where(and(eq(opsTeams.id, input.teamId), eq(opsTeams.operationId, op.id)));
    if (!team) throw AppError.validation({ teamId: ["Choose one of the listed teams"] });
    teamId = team.id;
  }

  return db.transaction(async (tx) => {
    const [member] = await tx
      .insert(opsMembers)
      .values({
        operationId: op.id,
        userId: user.id,
        displayName: input.displayName,
        level: "member",
        teamId,
      })
      .onConflictDoNothing()
      .returning();
    if (!member) {
      const [again] = await tx
        .select()
        .from(opsMembers)
        .where(and(eq(opsMembers.operationId, op.id), eq(opsMembers.userId, user.id)));
      return { operationId: op.id, memberId: again.id, alreadyMember: true };
    }
    await log(tx, op.id, member, "member", member.id, "joined", `${member.displayName} joined`);
    return { operationId: op.id, memberId: member.id, alreadyMember: false };
  });
}

export async function getShareInfo(user: SessionUser, operationId: string) {
  const { operation, member } = await requireMember(user, operationId);
  if (!canShareLink(ref(member))) throw AppError.notFound("Operation");
  return {
    id: operation.id,
    name: operation.name,
    joinToken: operation.joinToken,
    joinEnabled: operation.joinEnabled && operation.status === "live",
    config: operation.config,
  };
}

export async function changeJoinLink(
  user: SessionUser,
  operationId: string,
  action: "rotate" | "enable" | "disable",
) {
  const { operation, member } = await requireMember(user, operationId);
  if (!canShareLink(ref(member))) throw AppError.notFound("Operation");
  requireLive(operation);
  const values =
    action === "rotate"
      ? { joinToken: newJoinToken(), joinEnabled: true }
      : { joinEnabled: action === "enable" };
  await db.update(operations).set(values).where(eq(operations.id, operationId));
  await log(
    db,
    operationId,
    member,
    "operation",
    operationId,
    `link_${action}`,
    `${member.displayName} changed the invite link (${action})`,
  );
}

// ---------------------------------------------------------------- views

export type TaskView = OpsTask & {
  teamName: string | null;
  locationName: string | null;
  assigneeName: string | null;
};

async function tasksWithNames(operationId: string, where?: ReturnType<typeof and>) {
  const rows = await db
    .select({
      task: opsTasks,
      teamName: opsTeams.name,
      locationName: opsLocations.name,
      assigneeName: opsMembers.displayName,
    })
    .from(opsTasks)
    .leftJoin(opsTeams, eq(opsTeams.id, opsTasks.teamId))
    .leftJoin(opsLocations, eq(opsLocations.id, opsTasks.locationId))
    .leftJoin(opsMembers, eq(opsMembers.id, opsTasks.assigneeMemberId))
    .where(and(eq(opsTasks.operationId, operationId), where))
    .orderBy(asc(opsTasks.dueAt), asc(opsTasks.createdAt));
  return rows.map((r): TaskView => ({
    ...r.task,
    teamName: r.teamName,
    locationName: r.locationName,
    assigneeName: r.assigneeName,
  }));
}

const isOpen = (t: OpsTask) => t.status !== "done" && t.status !== "cancelled";
export const isDelayed = (t: OpsTask, now = new Date()) =>
  isOpen(t) && t.dueAt !== null && t.dueAt < now;

/** Everything a field user needs on one screen. */
export async function getFieldView(user: SessionUser, operationId: string) {
  const { operation, member } = await requireMember(user, operationId);

  const [team] = member.teamId
    ? await db
        .select({
          team: opsTeams,
          locationName: opsLocations.name,
          directions: opsLocations.directions,
        })
        .from(opsTeams)
        .leftJoin(opsLocations, eq(opsLocations.id, opsTeams.locationId))
        .where(eq(opsTeams.id, member.teamId))
    : [];

  const mine = await tasksWithNames(operationId, eq(opsTasks.assigneeMemberId, member.id));
  const available = await tasksWithNames(
    operationId,
    and(
      eq(opsTasks.status, "todo"),
      isNull(opsTasks.assigneeMemberId),
      member.teamId ? eq(opsTasks.teamId, member.teamId) : isNull(opsTasks.teamId),
    ),
  );

  const teammates = member.teamId
    ? await db
        .select({ id: opsMembers.id, name: opsMembers.displayName, level: opsMembers.level })
        .from(opsMembers)
        .where(and(eq(opsMembers.operationId, operationId), eq(opsMembers.teamId, member.teamId)))
        .orderBy(asc(opsMembers.displayName))
    : [];
  const coordinators = await db
    .select({ id: opsMembers.id, name: opsMembers.displayName, level: opsMembers.level })
    .from(opsMembers)
    .where(
      and(
        eq(opsMembers.operationId, operationId),
        inArray(opsMembers.level, ["organizer", "coordinator"]),
      ),
    );

  const myIssues = await db
    .select()
    .from(opsIssues)
    .where(and(eq(opsIssues.operationId, operationId), eq(opsIssues.reportedByMemberId, member.id)))
    .orderBy(desc(opsIssues.createdAt))
    .limit(5);

  const locations = await db
    .select({ id: opsLocations.id, name: opsLocations.name })
    .from(opsLocations)
    .where(eq(opsLocations.operationId, operationId))
    .orderBy(asc(opsLocations.createdAt));

  // Problems a team lead can respond to: open ones reported in their team.
  const teamIssues =
    member.teamId && member.level === "lead"
      ? await db
          .select({ issue: opsIssues, reporter: opsMembers.displayName })
          .from(opsIssues)
          .leftJoin(opsMembers, eq(opsMembers.id, opsIssues.reportedByMemberId))
          .where(
            and(
              eq(opsIssues.operationId, operationId),
              eq(opsIssues.teamId, member.teamId),
              ne(opsIssues.status, "resolved"),
            ),
          )
          .orderBy(desc(opsIssues.severity), asc(opsIssues.createdAt))
      : [];

  return {
    operation: {
      id: operation.id,
      name: operation.name,
      status: operation.status,
      config: operation.config,
    },
    member: { id: member.id, displayName: member.displayName, level: member.level },
    canCommand: canViewCommand(ref(member)),
    team: team
      ? {
          id: team.team.id,
          name: team.team.name,
          purpose: team.team.purpose,
          locationName: team.locationName,
          directions: team.directions,
        }
      : null,
    activeTasks: mine.filter(isOpen),
    doneTasks: mine.filter((t) => t.status === "done"),
    availableTasks: available,
    teammates,
    coordinators,
    myIssues,
    teamIssues: teamIssues
      .filter((r) => canHandleIssue(ref(member), r.issue))
      .map((r) => ({ ...r.issue, reporter: r.reporter })),
    locations,
  };
}

/** Command centre data (coordinators and organizers). */
export async function getCommandView(user: SessionUser, operationId: string, now = new Date()) {
  const { operation, member } = await requireMember(user, operationId);
  if (!canViewCommand(ref(member))) throw AppError.notFound("Operation");

  const tasks = await tasksWithNames(operationId);
  const issues = await db
    .select({
      issue: opsIssues,
      reporter: opsMembers.displayName,
      teamName: opsTeams.name,
      locationName: opsLocations.name,
    })
    .from(opsIssues)
    .leftJoin(opsMembers, eq(opsMembers.id, opsIssues.reportedByMemberId))
    .leftJoin(opsTeams, eq(opsTeams.id, opsIssues.teamId))
    .leftJoin(opsLocations, eq(opsLocations.id, opsIssues.locationId))
    .where(eq(opsIssues.operationId, operationId))
    .orderBy(desc(opsIssues.createdAt));
  const teams = await db
    .select()
    .from(opsTeams)
    .where(eq(opsTeams.operationId, operationId))
    .orderBy(asc(opsTeams.createdAt));
  const members = await db
    .select({ id: opsMembers.id, teamId: opsMembers.teamId })
    .from(opsMembers)
    .where(eq(opsMembers.operationId, operationId));
  const activity = await db
    .select()
    .from(opsActivity)
    .where(eq(opsActivity.operationId, operationId))
    .orderBy(desc(opsActivity.createdAt))
    .limit(15);

  const openIssues = issues.filter((i) => i.issue.status !== "resolved");
  const attention: Record<AttentionSignal, { count: number }> = {
    urgent_issues: { count: openIssues.filter((i) => i.issue.severity === "urgent").length },
    delayed_tasks: { count: tasks.filter((t) => isDelayed(t, now)).length },
    open_issues: { count: openIssues.length },
    unclaimed_tasks: {
      count: tasks.filter((t) => t.status === "todo" && !t.assigneeMemberId).length,
    },
  };

  return {
    operation: {
      id: operation.id,
      name: operation.name,
      status: operation.status,
      config: operation.config,
      startsAt: operation.startsAt,
    },
    member: { id: member.id, level: member.level },
    counts: {
      total: tasks.filter((t) => t.status !== "cancelled").length,
      done: tasks.filter((t) => t.status === "done").length,
      inProgress: tasks.filter((t) => t.status === "in_progress").length,
      todo: tasks.filter((t) => t.status === "todo").length,
      delayed: attention.delayed_tasks.count,
      people: members.length,
      openIssues: openIssues.length,
    },
    attentionOrder: operation.config.attention,
    attention,
    delayedTasks: tasks.filter((t) => isDelayed(t, now)).slice(0, 8),
    openIssues: openIssues.map((i) => ({
      ...i.issue,
      reporter: i.reporter,
      teamName: i.teamName,
      locationName: i.locationName,
    })),
    teams: teams.map((t) => {
      const teamTasks = tasks.filter((x) => x.teamId === t.id && x.status !== "cancelled");
      return {
        id: t.id,
        name: t.name,
        people: members.filter((m) => m.teamId === t.id).length,
        total: teamTasks.length,
        done: teamTasks.filter((x) => x.status === "done").length,
        delayed: teamTasks.filter((x) => isDelayed(x, now)).length,
      };
    }),
    activity,
  };
}

// ---------------------------------------------------------------- tasks

async function findTask(operationId: string, taskId: string) {
  const [task] = await db
    .select()
    .from(opsTasks)
    .where(and(eq(opsTasks.id, taskId), eq(opsTasks.operationId, operationId)));
  if (!task) throw AppError.notFound("Task");
  return task;
}

export async function actOnTask(
  user: SessionUser,
  operationId: string,
  taskId: string,
  input: TaskActionInput,
) {
  const { operation, member } = await requireMember(user, operationId);
  requireLive(operation);
  const task = await findTask(operationId, taskId);
  const m = ref(member);
  const now = new Date();

  let values: Partial<OpsTask>;
  let summary: string;
  if (input.action === "start") {
    if (!canStartTask(m, task)) throw AppError.forbidden("This task belongs to someone else.");
    if (
      task.status !== "todo" &&
      !(task.status === "in_progress" && task.assigneeMemberId === member.id)
    ) {
      throw AppError.conflict(
        "This task was already started or finished. Refresh to see the latest.",
      );
    }
    values = { status: "in_progress", assigneeMemberId: member.id, startedAt: now };
    summary = `${member.displayName} started "${task.title}"`;
  } else if (input.action === "complete") {
    if (!canFinishTask(m, task))
      throw AppError.forbidden("Only the person doing this task can complete it.");
    if (task.status === "done") return task;
    if (task.status === "cancelled") throw AppError.conflict("This task was cancelled.");
    values = {
      status: "done",
      completedAt: now,
      completedByMemberId: member.id,
      completionNote: input.note ?? null,
      assigneeMemberId: task.assigneeMemberId ?? member.id,
    };
    summary = `${member.displayName} completed "${task.title}"`;
  } else {
    if (!canFinishTask(m, task))
      throw AppError.forbidden("Only the person doing this task can hand it back.");
    if (task.status !== "in_progress")
      throw AppError.conflict("Only a task in progress can be handed back.");
    values = { status: "todo", assigneeMemberId: null, startedAt: null };
    summary = `${member.displayName} handed back "${task.title}"`;
  }

  return db.transaction(async (tx) => {
    // Optimistic concurrency: only update the version we read.
    const [row] = await tx
      .update(opsTasks)
      .set({ ...values, version: task.version + 1 })
      .where(and(eq(opsTasks.id, task.id), eq(opsTasks.version, task.version)))
      .returning();
    if (!row)
      throw AppError.conflict("Someone else changed this task just now. Refresh and try again.");
    await log(tx, operationId, member, "task", task.id, input.action, summary);
    return row;
  });
}

// ---------------------------------------------------------------- issues

export async function reportIssue(
  user: SessionUser,
  operationId: string,
  input: ReportIssueInput,
): Promise<OpsIssue> {
  const { operation, member } = await requireMember(user, operationId);
  requireLive(operation);

  let locationId: string | null = null;
  if (input.locationId) {
    const [loc] = await db
      .select({ id: opsLocations.id })
      .from(opsLocations)
      .where(and(eq(opsLocations.id, input.locationId), eq(opsLocations.operationId, operationId)));
    if (!loc) throw AppError.validation({ locationId: ["Choose one of the listed places"] });
    locationId = loc.id;
  }

  return db.transaction(async (tx) => {
    const [issue] = await tx
      .insert(opsIssues)
      .values({
        operationId,
        reportedByMemberId: member.id,
        teamId: member.teamId,
        locationId,
        title: input.title,
        details: input.details ?? null,
        category: input.category ?? null,
        severity: input.severity,
      })
      .returning();
    const urgent = input.severity === "urgent" ? "URGENT: " : "";
    await log(
      tx,
      operationId,
      member,
      "issue",
      issue.id,
      "reported",
      `${urgent}${member.displayName} reported "${issue.title}"`,
    );
    return issue;
  });
}

export async function actOnIssue(
  user: SessionUser,
  operationId: string,
  issueId: string,
  input: IssueActionInput,
) {
  const { operation, member } = await requireMember(user, operationId);
  requireLive(operation);
  const [issue] = await db
    .select()
    .from(opsIssues)
    .where(and(eq(opsIssues.id, issueId), eq(opsIssues.operationId, operationId)));
  if (!issue) throw AppError.notFound("Problem");
  if (!canHandleIssue(ref(member), issue)) throw AppError.forbidden();
  if (issue.status === "resolved") throw AppError.conflict("This was already resolved.");

  const now = new Date();
  const values =
    input.action === "acknowledge"
      ? { status: "acknowledged" as const, acknowledgedAt: now, acknowledgedByMemberId: member.id }
      : {
          status: "resolved" as const,
          resolvedAt: now,
          resolvedByMemberId: member.id,
          resolutionNote: input.note ?? null,
          ...(issue.acknowledgedAt
            ? {}
            : { acknowledgedAt: now, acknowledgedByMemberId: member.id }),
        };

  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(opsIssues)
      .set(values)
      .where(eq(opsIssues.id, issue.id))
      .returning();
    const verb = input.action === "acknowledge" ? "is handling" : "resolved";
    await log(
      tx,
      operationId,
      member,
      "issue",
      issue.id,
      input.action,
      `${member.displayName} ${verb} "${issue.title}"`,
    );
    return row;
  });
}

// ---------------------------------------------------------------- helpers for pages

export function roleLabel(config: OpsConfig, level: PermissionLevel) {
  return config.roleLabels[level];
}

/** Shared with the closure service (same module family). */
export { ref as memberRef, log as logActivity };
