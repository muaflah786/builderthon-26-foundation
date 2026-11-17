import "server-only";

import { and, eq } from "drizzle-orm";
import { AppError } from "@/lib/errors";
import { atLeast } from "@/lib/ops/permissions";
import { db } from "@/server/db";
import { opsMembers, opsPositions, opsTeams } from "@/server/db/schema/ops";
import { logger } from "@/server/logger";
import { memberRef, requireMember } from "@/server/services/ops";
import type { SessionUser } from "@/types/auth";

/**
 * Voluntary location sharing. A member's row exists only while they share.
 * Visibility: coordinators+ see everyone; others see their own team (and themselves).
 */

export type SharedPosition = {
  memberId: string;
  name: string;
  teamName: string | null;
  lat: number;
  lng: number;
  accuracy: number | null;
  updatedAt: string;
  me: boolean;
};

export async function sharePosition(
  user: SessionUser,
  operationId: string,
  input: { lat: number; lng: number; accuracy?: number | null },
) {
  const { operation, member } = await requireMember(user, operationId);
  if (operation.status !== "live") throw AppError.conflict("This operation is closed.");
  const values = {
    operationId,
    memberId: member.id,
    lat: input.lat,
    lng: input.lng,
    accuracy: input.accuracy ?? null,
    updatedAt: new Date(),
  };
  await db
    .insert(opsPositions)
    .values(values)
    .onConflictDoUpdate({
      target: opsPositions.memberId,
      set: {
        lat: values.lat,
        lng: values.lng,
        accuracy: values.accuracy,
        updatedAt: values.updatedAt,
      },
    });
}

export async function stopSharing(user: SessionUser, operationId: string) {
  const { member } = await requireMember(user, operationId);
  await db.delete(opsPositions).where(eq(opsPositions.memberId, member.id));
}

/** Positions this member may see. Fails soft (empty list) so the page always renders. */
export async function listPositions(
  user: SessionUser,
  operationId: string,
): Promise<SharedPosition[]> {
  const { member } = await requireMember(user, operationId);
  const m = memberRef(member);
  try {
    const rows = await db
      .select({
        p: opsPositions,
        name: opsMembers.displayName,
        teamId: opsMembers.teamId,
        teamName: opsTeams.name,
      })
      .from(opsPositions)
      .innerJoin(opsMembers, eq(opsMembers.id, opsPositions.memberId))
      .leftJoin(opsTeams, eq(opsTeams.id, opsMembers.teamId))
      .where(and(eq(opsPositions.operationId, operationId)));
    return rows
      .filter(
        (r) =>
          atLeast(m, "coordinator") ||
          r.p.memberId === member.id ||
          (member.teamId !== null && r.teamId === member.teamId),
      )
      .map((r) => ({
        memberId: r.p.memberId,
        name: r.name,
        teamName: r.teamName,
        lat: r.p.lat,
        lng: r.p.lng,
        accuracy: r.p.accuracy,
        updatedAt: r.p.updatedAt.toISOString(),
        me: r.p.memberId === member.id,
      }));
  } catch (error) {
    logger.warn("positions unavailable", { error: String(error) });
    return [];
  }
}
