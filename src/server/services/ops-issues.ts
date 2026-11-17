import "server-only";

import { desc, eq } from "drizzle-orm";
import { AppError } from "@/lib/errors";
import { canViewCommand } from "@/lib/ops/permissions";
import { db } from "@/server/db";
import { opsIssues, opsLocations, opsMembers, opsTeams } from "@/server/db/schema/ops";
import { memberRef, requireMember } from "@/server/services/ops";
import type { SessionUser } from "@/types/auth";

/** Issue overview for coordinators and organizers. Every number comes from stored records. */
export async function listIssues(user: SessionUser, operationId: string) {
  const { operation, member } = await requireMember(user, operationId);
  if (!canViewCommand(memberRef(member))) throw AppError.notFound("Operation");

  const rows = await db
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

  const issues = rows.map((r) => ({
    ...r.issue,
    reporter: r.reporter,
    teamName: r.teamName,
    locationName: r.locationName,
  }));
  const minutes = issues
    .filter((i) => i.resolvedAt)
    .map((i) => Math.round((i.resolvedAt!.getTime() - i.createdAt.getTime()) / 60_000))
    .sort((a, b) => a - b);
  const median = minutes.length ? minutes[Math.floor((minutes.length - 1) / 2)] : null;

  return {
    operation: {
      id: operation.id,
      name: operation.name,
      status: operation.status,
      config: operation.config,
    },
    issues,
    counts: {
      all: issues.length,
      open: issues.filter((i) => i.status === "open").length,
      acknowledged: issues.filter((i) => i.status === "acknowledged").length,
      resolved: issues.filter((i) => i.status === "resolved").length,
      urgentOpen: issues.filter((i) => i.severity === "urgent" && i.status !== "resolved").length,
    },
    medianResolveMinutes: median,
  };
}
