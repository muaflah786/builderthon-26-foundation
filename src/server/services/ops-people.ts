import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";
import { AppError } from "@/lib/errors";
import { canManagePeople, canRenameRoles, canSetLevel, canSetTeam } from "@/lib/ops/permissions";
import { roleLabelsSchema, type RoleLabels } from "@/lib/ops/types";
import type { UpdateMemberInput } from "@/lib/validation/ops";
import { db } from "@/server/db";
import { operations, opsMembers, opsTeams } from "@/server/db/schema/ops";
import { logActivity, memberRef, requireMember } from "@/server/services/ops";
import type { SessionUser } from "@/types/auth";

/**
 * People and roles inside one operation. Access is decided by the four fixed
 * levels only; role labels are display text and never affect permissions.
 */

export async function getPeople(user: SessionUser, operationId: string) {
  const { operation, member } = await requireMember(user, operationId);
  if (!canManagePeople(memberRef(member))) throw AppError.notFound("Operation");

  const members = await db
    .select({
      id: opsMembers.id,
      displayName: opsMembers.displayName,
      level: opsMembers.level,
      teamId: opsMembers.teamId,
      joinedAt: opsMembers.createdAt,
    })
    .from(opsMembers)
    .where(eq(opsMembers.operationId, operationId))
    .orderBy(asc(opsMembers.displayName));
  const teams = await db
    .select({ id: opsTeams.id, name: opsTeams.name })
    .from(opsTeams)
    .where(eq(opsTeams.operationId, operationId))
    .orderBy(asc(opsTeams.createdAt));

  return {
    operation: {
      id: operation.id,
      name: operation.name,
      status: operation.status,
      config: operation.config,
    },
    me: { id: member.id, level: member.level, teamId: member.teamId },
    members,
    teams,
  };
}

export async function updateMember(
  user: SessionUser,
  operationId: string,
  memberId: string,
  input: UpdateMemberInput,
) {
  const { operation, member: actor } = await requireMember(user, operationId);
  const actorRef = memberRef(actor);
  if (!canManagePeople(actorRef)) throw AppError.notFound("Operation");
  if (operation.status !== "live") throw AppError.conflict("This operation is closed.");

  const [target] = await db
    .select()
    .from(opsMembers)
    .where(and(eq(opsMembers.id, memberId), eq(opsMembers.operationId, operationId)));
  if (!target) throw AppError.notFound("Person");

  const values: { teamId?: string | null; level?: typeof target.level } = {};
  const changes: string[] = [];
  const { roleLabels } = operation.config;

  if (input.level !== undefined && input.level !== target.level) {
    if (!canSetLevel(actorRef, target, input.level)) {
      throw AppError.forbidden("You can't give or change that role.");
    }
    values.level = input.level;
    changes.push(`is now ${roleLabels[input.level]}`);
  }

  if (input.teamId !== undefined && input.teamId !== target.teamId) {
    if (!canSetTeam(actorRef, target)) throw AppError.forbidden("You can't move this person.");
    let teamName = "no team";
    if (input.teamId !== null) {
      const [team] = await db
        .select({ id: opsTeams.id, name: opsTeams.name })
        .from(opsTeams)
        .where(and(eq(opsTeams.id, input.teamId), eq(opsTeams.operationId, operationId)));
      if (!team) throw AppError.validation({ teamId: ["Choose one of the listed teams"] });
      teamName = team.name;
    }
    values.teamId = input.teamId;
    changes.push(`moved to ${teamName}`);
  }

  if (changes.length === 0) return target;

  return db.transaction(async (tx) => {
    const demotingOrganizer =
      target.level === "organizer" && values.level !== undefined && values.level !== "organizer";
    // Atomic guard: the update only applies while another organizer still exists,
    // so two organizers demoting each other at once can never leave none.
    const [row] = await tx
      .update(opsMembers)
      .set(values)
      .where(
        and(
          eq(opsMembers.id, target.id),
          demotingOrganizer
            ? sql`(select count(*) from ops_members where operation_id = ${operationId} and level = 'organizer') > 1`
            : undefined,
        ),
      )
      .returning();
    if (!row) {
      throw AppError.conflict(
        `There must always be at least one ${roleLabels.organizer}. Give someone else that role first.`,
      );
    }
    await logActivity(
      tx,
      operationId,
      actor,
      "member",
      target.id,
      "updated",
      `${target.displayName} ${changes.join(" and ")} (by ${actor.displayName})`,
    );
    return row;
  });
}

export async function renameRoles(
  user: SessionUser,
  operationId: string,
  labels: RoleLabels,
): Promise<RoleLabels> {
  const { operation, member } = await requireMember(user, operationId);
  if (!canRenameRoles(memberRef(member))) throw AppError.notFound("Operation");
  if (operation.status !== "live") throw AppError.conflict("This operation is closed.");
  const roleLabels = roleLabelsSchema.parse(labels);

  await db.transaction(async (tx) => {
    await tx
      .update(operations)
      .set({ config: { ...operation.config, roleLabels } })
      .where(eq(operations.id, operationId));
    await logActivity(
      tx,
      operationId,
      member,
      "operation",
      operationId,
      "roles_renamed",
      `${member.displayName} renamed the roles`,
    );
  });
  return roleLabels;
}
