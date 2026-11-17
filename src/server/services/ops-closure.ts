import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import { AppError } from "@/lib/errors";
import { canClose, canViewSummary } from "@/lib/ops/permissions";
import type { CloseOperationInput } from "@/lib/validation/ops";
import { db } from "@/server/db";
import {
  operations,
  opsActivity,
  opsIssues,
  opsLocations,
  opsMembers,
  opsTasks,
  opsTeams,
} from "@/server/db/schema/ops";
import { logActivity, memberRef, requireMember } from "@/server/services/ops";
import type { SessionUser } from "@/types/auth";

/**
 * Closing an operation and its summary. Every number in the summary is computed
 * from stored records at request time: nothing is estimated or generated.
 * Records are never deleted on close; the operation becomes read-only.
 */

const OPEN_TASK = ["todo", "in_progress", "blocked"] as const;

async function requireOrganizer(user: SessionUser, operationId: string) {
  const ctx = await requireMember(user, operationId);
  if (!canClose(memberRef(ctx.member))) throw AppError.notFound("Operation");
  return ctx;
}

/** What is still open, shown before the organizer confirms closing. */
export async function getClosePreview(user: SessionUser, operationId: string) {
  const { operation } = await requireOrganizer(user, operationId);
  const tasks = await db
    .select({ status: opsTasks.status })
    .from(opsTasks)
    .where(eq(opsTasks.operationId, operationId));
  const issues = await db
    .select({ status: opsIssues.status })
    .from(opsIssues)
    .where(eq(opsIssues.operationId, operationId));
  return {
    id: operation.id,
    name: operation.name,
    status: operation.status,
    config: operation.config,
    openTasks: tasks.filter((t) => (OPEN_TASK as readonly string[]).includes(t.status)).length,
    openIssues: issues.filter((i) => i.status !== "resolved").length,
  };
}

export async function closeOperation(
  user: SessionUser,
  operationId: string,
  input: CloseOperationInput,
) {
  const { operation, member } = await requireOrganizer(user, operationId);
  if (operation.status !== "live") throw AppError.conflict("This operation is already closed.");

  await db.transaction(async (tx) => {
    let cancelled = 0;
    if (input.unfinished === "cancel") {
      const rows = await tx
        .update(opsTasks)
        .set({ status: "cancelled" })
        .where(and(eq(opsTasks.operationId, operationId), inArray(opsTasks.status, [...OPEN_TASK])))
        .returning({ id: opsTasks.id });
      cancelled = rows.length;
    }
    await tx
      .update(operations)
      .set({
        status: "closed",
        joinEnabled: false,
        closedAt: new Date(),
        closedByMemberId: member.id,
      })
      .where(eq(operations.id, operationId));
    await logActivity(
      tx,
      operationId,
      member,
      "operation",
      operationId,
      "closed",
      cancelled > 0
        ? `${member.displayName} closed the operation (${cancelled} unfinished marked cancelled)`
        : `${member.displayName} closed the operation`,
    );
  });
}

function minutesBetween(a: Date | null, b: Date | null) {
  return a && b ? Math.max(0, Math.round((b.getTime() - a.getTime()) / 60_000)) : null;
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const s = [...values].sort((x, y) => x - y);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

/** Operation summary for organizers and coordinators. Works before and after closing. */
export async function getSummary(user: SessionUser, operationId: string, now = new Date()) {
  const { operation, member } = await requireMember(user, operationId);
  if (!canViewSummary(memberRef(member))) throw AppError.notFound("Operation");

  const tasks = await db
    .select({ task: opsTasks, assigneeName: opsMembers.displayName })
    .from(opsTasks)
    .leftJoin(opsMembers, eq(opsMembers.id, opsTasks.assigneeMemberId))
    .where(eq(opsTasks.operationId, operationId))
    .orderBy(asc(opsTasks.dueAt), asc(opsTasks.createdAt));
  const issues = await db
    .select()
    .from(opsIssues)
    .where(eq(opsIssues.operationId, operationId))
    .orderBy(asc(opsIssues.createdAt));
  const teams = await db
    .select()
    .from(opsTeams)
    .where(eq(opsTeams.operationId, operationId))
    .orderBy(asc(opsTeams.createdAt));
  const members = await db
    .select({ id: opsMembers.id, teamId: opsMembers.teamId })
    .from(opsMembers)
    .where(eq(opsMembers.operationId, operationId));
  const timeline = await db
    .select()
    .from(opsActivity)
    .where(eq(opsActivity.operationId, operationId))
    .orderBy(asc(opsActivity.createdAt));

  const all = tasks.map((t) => t.task);
  const counted = all.filter((t) => t.status !== "cancelled");
  const done = counted.filter((t) => t.status === "done");
  const doneLate = done.filter((t) => t.dueAt && t.completedAt && t.completedAt > t.dueAt);
  const unfinished = tasks.filter((t) => (OPEN_TASK as readonly string[]).includes(t.task.status));
  const end = operation.closedAt ?? now;

  const responseMinutes = issues
    .map((i) => minutesBetween(i.createdAt, i.acknowledgedAt))
    .filter((m): m is number => m !== null);
  const resolveMinutes = issues
    .map((i) => minutesBetween(i.createdAt, i.resolvedAt))
    .filter((m): m is number => m !== null);

  return {
    operation: {
      id: operation.id,
      name: operation.name,
      situation: operation.situation,
      status: operation.status,
      config: operation.config,
      startsAt: operation.startsAt,
      createdAt: operation.createdAt,
      closedAt: operation.closedAt,
    },
    canExport: canClose(memberRef(member)),
    canClose: canClose(memberRef(member)) && operation.status === "live",
    people: members.length,
    tasks: {
      total: counted.length,
      done: done.length,
      doneLate: doneLate.length,
      unfinished: unfinished.length,
      cancelled: all.length - counted.length,
      completion: counted.length ? Math.round((done.length / counted.length) * 100) : 0,
      unfinishedList: unfinished.slice(0, 20).map((t) => ({
        id: t.task.id,
        title: t.task.title,
        status: t.task.status,
        assigneeName: t.assigneeName,
        late: t.task.dueAt !== null && t.task.dueAt < end,
      })),
    },
    issues: {
      total: issues.length,
      urgent: issues.filter((i) => i.severity === "urgent").length,
      resolved: issues.filter((i) => i.status === "resolved").length,
      unresolved: issues
        .filter((i) => i.status !== "resolved")
        .map((i) => ({ id: i.id, title: i.title, severity: i.severity, status: i.status })),
      medianResponseMinutes: median(responseMinutes),
      medianResolveMinutes: median(resolveMinutes),
    },
    teams: teams.map((team) => {
      const t = counted.filter((x) => x.teamId === team.id);
      return {
        id: team.id,
        name: team.name,
        people: members.filter((m) => m.teamId === team.id).length,
        total: t.length,
        done: t.filter((x) => x.status === "done").length,
      };
    }),
    timeline,
  };
}

// ---------------------------------------------------------------- CSV export

/** Quotes a CSV cell and neutralises spreadsheet formulas (CSV injection). */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(header: string[], rows: unknown[][]) {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/** Records as CSV for the organizer. Contains no emails or passwords. */
export async function exportCsv(
  user: SessionUser,
  operationId: string,
  type: "tasks" | "issues" | "activity",
): Promise<{ filename: string; csv: string }> {
  const { operation } = await requireOrganizer(user, operationId);
  const slug =
    operation.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "operation";

  if (type === "tasks") {
    const rows = await db
      .select({
        t: opsTasks,
        team: opsTeams.name,
        place: opsLocations.name,
        who: opsMembers.displayName,
      })
      .from(opsTasks)
      .leftJoin(opsTeams, eq(opsTeams.id, opsTasks.teamId))
      .leftJoin(opsLocations, eq(opsLocations.id, opsTasks.locationId))
      .leftJoin(opsMembers, eq(opsMembers.id, opsTasks.assigneeMemberId))
      .where(eq(opsTasks.operationId, operationId))
      .orderBy(asc(opsTasks.dueAt), asc(opsTasks.createdAt));
    return {
      filename: `${slug}-tasks.csv`,
      csv: toCsv(
        [
          "title",
          "team",
          "place",
          "status",
          "priority",
          "assigned_to",
          "due_at",
          "started_at",
          "completed_at",
          "note",
        ],
        rows.map((r) => [
          r.t.title,
          r.team,
          r.place,
          r.t.status,
          r.t.priority,
          r.who,
          r.t.dueAt,
          r.t.startedAt,
          r.t.completedAt,
          r.t.completionNote,
        ]),
      ),
    };
  }

  if (type === "issues") {
    const rows = await db
      .select({
        i: opsIssues,
        place: opsLocations.name,
        team: opsTeams.name,
        who: opsMembers.displayName,
      })
      .from(opsIssues)
      .leftJoin(opsLocations, eq(opsLocations.id, opsIssues.locationId))
      .leftJoin(opsTeams, eq(opsTeams.id, opsIssues.teamId))
      .leftJoin(opsMembers, eq(opsMembers.id, opsIssues.reportedByMemberId))
      .where(eq(opsIssues.operationId, operationId))
      .orderBy(asc(opsIssues.createdAt));
    return {
      filename: `${slug}-problems.csv`,
      csv: toCsv(
        [
          "title",
          "category",
          "severity",
          "status",
          "place",
          "team",
          "reported_by",
          "reported_at",
          "acknowledged_at",
          "resolved_at",
          "resolution_note",
          "details",
        ],
        rows.map((r) => [
          r.i.title,
          r.i.category,
          r.i.severity,
          r.i.status,
          r.place,
          r.team,
          r.who,
          r.i.createdAt,
          r.i.acknowledgedAt,
          r.i.resolvedAt,
          r.i.resolutionNote,
          r.i.details,
        ]),
      ),
    };
  }

  const rows = await db
    .select()
    .from(opsActivity)
    .where(eq(opsActivity.operationId, operationId))
    .orderBy(asc(opsActivity.createdAt));
  return {
    filename: `${slug}-activity.csv`,
    csv: toCsv(
      ["time", "action", "what", "summary"],
      rows.map((r) => [r.createdAt, r.action, r.entityType, r.summary]),
    ),
  };
}
