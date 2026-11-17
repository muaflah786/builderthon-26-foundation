import type { PermissionLevel } from "@/lib/ops/types";

/**
 * The single permission matrix for every operation, whatever the situation.
 * Uses ONLY the fixed internal level ids, never display labels. Isomorphic so the
 * UI can hide controls, but the server always re-checks in services.
 */

const RANK: Record<PermissionLevel, number> = { member: 1, lead: 2, coordinator: 3, organizer: 4 };

export type MemberRef = { id: string; level: PermissionLevel; teamId: string | null };

export function atLeast(member: Pick<MemberRef, "level">, level: PermissionLevel) {
  return RANK[member.level] >= RANK[level];
}

/** Command centre, all tasks and all problems. */
export const canViewCommand = (m: MemberRef) => atLeast(m, "coordinator");

/** Share, rotate or disable the join link. */
export const canShareLink = (m: MemberRef) => atLeast(m, "coordinator");

/** Acknowledge or resolve a problem: coordinators, or the lead of that problem's team. */
export function canHandleIssue(m: MemberRef, issue: { teamId: string | null }) {
  if (atLeast(m, "coordinator")) return true;
  return m.level === "lead" && issue.teamId !== null && issue.teamId === m.teamId;
}

/** Claim/start a task: unassigned and in my team (or no team), or already mine. */
export function canStartTask(
  m: MemberRef,
  task: { teamId: string | null; assigneeMemberId: string | null },
) {
  if (task.assigneeMemberId) return task.assigneeMemberId === m.id;
  if (atLeast(m, "coordinator")) return true;
  return task.teamId === null || task.teamId === m.teamId;
}

/** Complete or release a task: its assignee, or a coordinator. */
export function canFinishTask(m: MemberRef, task: { assigneeMemberId: string | null }) {
  return task.assigneeMemberId === m.id || atLeast(m, "coordinator");
}

/** Close the operation and export its records: organizer only. */
export const canClose = (m: MemberRef) => m.level === "organizer";

/** Read the operation summary: coordinators and organizers. */
export const canViewSummary = (m: MemberRef) => atLeast(m, "coordinator");

/** Open the People screen and move people between teams. */
export const canManagePeople = (m: MemberRef) => atLeast(m, "coordinator");

/**
 * Change someone's level. Organizers may set any level. Coordinators may only
 * move people between `member` and `lead`, and never touch coordinators or
 * organizers. (The "last organizer" rule needs a count and lives in the service.)
 */
export function canSetLevel(
  actor: MemberRef,
  target: Pick<MemberRef, "id" | "level">,
  next: PermissionLevel,
) {
  if (actor.level === "organizer") return true;
  if (actor.level !== "coordinator") return false;
  const lowerLevels: PermissionLevel[] = ["member", "lead"];
  return lowerLevels.includes(target.level) && lowerLevels.includes(next);
}

/** Change another person's team: coordinators+, but coordinators only for leads and members. */
export function canSetTeam(actor: MemberRef, target: Pick<MemberRef, "level">) {
  if (actor.level === "organizer") return true;
  return actor.level === "coordinator" && (target.level === "member" || target.level === "lead");
}

/** Rename the four role labels: organizer only (labels never change access). */
export const canRenameRoles = (m: MemberRef) => m.level === "organizer";

type TaskScope = { teamId: string | null; assigneeMemberId: string | null; status?: string };

/**
 * The single visibility rule for tasks (docs/OPS_STATUS_AND_CONFIG_ENGINE_DESIGN.md D3).
 * Computed from the member's CURRENT level and team on every request.
 */
export function canSeeTask(m: MemberRef, task: TaskScope) {
  if (atLeast(m, "coordinator")) return true;
  if (task.assigneeMemberId === m.id) return true;
  if (m.level === "lead") return task.teamId !== null && task.teamId === m.teamId;
  // Members: unclaimed waiting tasks of their own team (or with no team when they have none).
  return task.status === "todo" && task.assigneeMemberId === null && task.teamId === m.teamId;
}

/** Task overview screen: coordinators+ (everything) and leads (their team). */
export const canViewTaskList = (m: MemberRef) => atLeast(m, "lead");

/** Create a task for a team (null = no team): coordinators+, or a lead for their own team. */
export function canCreateTaskFor(m: MemberRef, teamId: string | null) {
  if (atLeast(m, "coordinator")) return true;
  return m.level === "lead" && teamId !== null && teamId === m.teamId;
}

/** Edit or reassign a task: coordinators+, or a lead for their own team's tasks. */
export function canEditTask(m: MemberRef, task: Pick<TaskScope, "teamId">) {
  return canCreateTaskFor(m, task.teamId);
}
