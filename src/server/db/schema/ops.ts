import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import {
  ISSUE_STATUSES,
  PERMISSION_LEVELS,
  PRIORITIES,
  SEVERITIES,
  TASK_STATUSES,
  type OpsConfig,
} from "@/lib/ops/types";
import { idColumn, timestamps } from "@/server/db/columns";
import { user } from "@/server/db/schema/auth";

/**
 * Universal operations engine tables. Every row (except `operations`) carries
 * `operation_id`; services always filter by it. Nothing here is scenario-specific:
 * words, role labels and categories live in `operations.config` (JSON).
 */

export const operations = sqliteTable("operations", {
  id: idColumn(),
  name: text("name").notNull(),
  /** The organizer's own description of the situation. */
  situation: text("situation").notNull(),
  /** Informational only: which scenario pack the setup started from. */
  templateId: text("template_id"),
  config: text("config", { mode: "json" }).$type<OpsConfig>().notNull(),
  status: text("status", { enum: ["live", "closed"] })
    .notNull()
    .default("live"),
  startsAt: integer("starts_at", { mode: "timestamp_ms" }),
  joinToken: text("join_token").notNull().unique(),
  joinEnabled: integer("join_enabled", { mode: "boolean" }).notNull().default(true),
  closedAt: integer("closed_at", { mode: "timestamp_ms" }),
  /** Member id of the organizer who closed it. */
  closedByMemberId: text("closed_by_member_id"),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  ...timestamps(),
});

export const opsLocations = sqliteTable(
  "ops_locations",
  {
    id: idColumn(),
    operationId: text("operation_id")
      .notNull()
      .references(() => operations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    directions: text("directions"),
    ...timestamps(),
  },
  (t) => [index("ops_locations_op_idx").on(t.operationId)],
);

export const opsTeams = sqliteTable(
  "ops_teams",
  {
    id: idColumn(),
    operationId: text("operation_id")
      .notNull()
      .references(() => operations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    purpose: text("purpose"),
    locationId: text("location_id").references(() => opsLocations.id, { onDelete: "set null" }),
    /** Removed teams are archived, never deleted, so history stays accurate. */
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    archivedByMemberId: text("archived_by_member_id"),
    ...timestamps(),
  },
  (t) => [index("ops_teams_op_idx").on(t.operationId)],
);

export const opsMembers = sqliteTable(
  "ops_members",
  {
    id: idColumn(),
    operationId: text("operation_id")
      .notNull()
      .references(() => operations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    level: text("level", { enum: PERMISSION_LEVELS }).notNull().default("member"),
    teamId: text("team_id").references(() => opsTeams.id, { onDelete: "set null" }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("ops_members_op_user_idx").on(t.operationId, t.userId),
    index("ops_members_user_idx").on(t.userId),
  ],
);

export const opsTasks = sqliteTable(
  "ops_tasks",
  {
    id: idColumn(),
    operationId: text("operation_id")
      .notNull()
      .references(() => operations.id, { onDelete: "cascade" }),
    teamId: text("team_id").references(() => opsTeams.id, { onDelete: "set null" }),
    locationId: text("location_id").references(() => opsLocations.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    instructions: text("instructions"),
    category: text("category"),
    priority: text("priority", { enum: PRIORITIES }).notNull().default("normal"),
    status: text("status", { enum: TASK_STATUSES }).notNull().default("todo"),
    assigneeMemberId: text("assignee_member_id").references(() => opsMembers.id, {
      onDelete: "set null",
    }),
    dueAt: integer("due_at", { mode: "timestamp_ms" }),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    completionNote: text("completion_note"),
    completedByMemberId: text("completed_by_member_id"),
    createdByMemberId: text("created_by_member_id"),
    /** When true, a lead or coordinator (never the completer) must check the work. */
    requiresVerification: integer("requires_verification", { mode: "boolean" })
      .notNull()
      .default(false),
    verifiedAt: integer("verified_at", { mode: "timestamp_ms" }),
    verifiedByMemberId: text("verified_by_member_id"),
    blockedReason: text("blocked_reason"),
    blockedAt: integer("blocked_at", { mode: "timestamp_ms" }),
    cancelledReason: text("cancelled_reason"),
    /** Incremented on every change; used for conflict detection. */
    version: integer("version").notNull().default(1),
    ...timestamps(),
  },
  (t) => [
    index("ops_tasks_op_status_idx").on(t.operationId, t.status),
    index("ops_tasks_op_team_idx").on(t.operationId, t.teamId),
    index("ops_tasks_op_assignee_idx").on(t.operationId, t.assigneeMemberId),
  ],
);

export const opsIssues = sqliteTable(
  "ops_issues",
  {
    id: idColumn(),
    operationId: text("operation_id")
      .notNull()
      .references(() => operations.id, { onDelete: "cascade" }),
    reportedByMemberId: text("reported_by_member_id").references(() => opsMembers.id, {
      onDelete: "set null",
    }),
    teamId: text("team_id").references(() => opsTeams.id, { onDelete: "set null" }),
    locationId: text("location_id").references(() => opsLocations.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    details: text("details"),
    category: text("category"),
    severity: text("severity", { enum: SEVERITIES }).notNull().default("normal"),
    status: text("status", { enum: ISSUE_STATUSES }).notNull().default("open"),
    acknowledgedByMemberId: text("acknowledged_by_member_id"),
    acknowledgedAt: integer("acknowledged_at", { mode: "timestamp_ms" }),
    resolvedByMemberId: text("resolved_by_member_id"),
    resolvedAt: integer("resolved_at", { mode: "timestamp_ms" }),
    resolutionNote: text("resolution_note"),
    ...timestamps(),
  },
  (t) => [index("ops_issues_op_status_idx").on(t.operationId, t.status)],
);

/** Append-only history. */
export const opsActivity = sqliteTable(
  "ops_activity",
  {
    id: idColumn(),
    operationId: text("operation_id")
      .notNull()
      .references(() => operations.id, { onDelete: "cascade" }),
    actorMemberId: text("actor_member_id"),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(),
    summary: text("summary").notNull(),
    /** Structured details, e.g. { field, from, to, reason }. */
    data: text("data", { mode: "json" }).$type<Record<string, unknown>>(),
    ...timestamps(),
  },
  (t) => [
    index("ops_activity_op_created_idx").on(t.operationId, t.createdAt),
    index("ops_activity_op_entity_idx").on(t.operationId, t.entityId),
  ],
);

export type Operation = typeof operations.$inferSelect;
export type OpsMember = typeof opsMembers.$inferSelect;
export type OpsTeam = typeof opsTeams.$inferSelect;
export type OpsLocation = typeof opsLocations.$inferSelect;
export type OpsTask = typeof opsTasks.$inferSelect;
export type OpsIssue = typeof opsIssues.$inferSelect;
export type OpsActivity = typeof opsActivity.$inferSelect;
