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
