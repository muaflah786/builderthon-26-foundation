import { z } from "zod";
import { PERMISSION_LEVELS, PRIORITIES, SEVERITIES } from "@/lib/ops/types";

/** Request schemas for the operations API (shared by forms and route handlers). */

const optional = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(max).optional(),
  );

export const opParamsSchema = z.object({ id: z.string().min(1).max(64) });
export const opChildParamsSchema = z.object({
  id: z.string().min(1).max(64),
  childId: z.string().min(1).max(64),
});

export const joinOperationSchema = z.object({
  token: z.string().min(16).max(64),
  displayName: z.string().trim().min(1, "Enter your name").max(80),
  teamId: optional(64),
});
export type JoinOperationInput = z.infer<typeof joinOperationSchema>;

export const taskActionSchema = z.object({
  action: z.enum(["start", "complete", "release"]),
  note: optional(1000),
});
export type TaskActionInput = z.infer<typeof taskActionSchema>;

export const reportIssueSchema = z.object({
  title: z.string().trim().min(1, "Say briefly what's wrong").max(160),
  details: optional(2000),
  category: optional(40),
  severity: z.enum(SEVERITIES).default("normal"),
  locationId: optional(64),
});
export type ReportIssueInput = z.infer<typeof reportIssueSchema>;

export const issueActionSchema = z.object({
  action: z.enum(["acknowledge", "resolve"]),
  note: optional(1000),
});
export type IssueActionInput = z.infer<typeof issueActionSchema>;

export const joinLinkActionSchema = z.object({ action: z.enum(["rotate", "enable", "disable"]) });

export const closeOperationSchema = z.object({
  /** What happens to tasks that are not done: keep them as unfinished, or mark them cancelled. */
  unfinished: z.enum(["leave", "cancel"]).default("leave"),
});
export type CloseOperationInput = z.infer<typeof closeOperationSchema>;

export const exportQuerySchema = z.object({ type: z.enum(["tasks", "issues", "activity"]) });

export const updateMemberSchema = z
  .object({
    /** "" or null = no team. */
    teamId: z
      .preprocess((v) => (v === "" ? null : v), z.string().min(1).max(64).nullable())
      .optional(),
    level: z.enum(PERMISSION_LEVELS).optional(),
  })
  .refine((v) => v.teamId !== undefined || v.level !== undefined, "Nothing to change");
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

const optionalId = z.preprocess((v) => (v === "" ? null : v), z.string().min(1).max(64).nullable());
const optionalDue = z.preprocess(
  (v) => (v === "" ? null : v),
  z.iso.datetime({ offset: true }).nullable(),
);

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Give the task a short name").max(160),
  instructions: optional(1000),
  teamId: optionalId.optional(),
  assigneeMemberId: optionalId.optional(),
  locationId: optionalId.optional(),
  dueAt: optionalDue.optional(),
  priority: z.enum(PRIORITIES).default("normal"),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = createTaskSchema.partial().extend({
  /** The version the editor started from; a newer version means someone else changed it. */
  expectedVersion: z.number().int().min(1),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const TASK_FILTERS = ["all", "todo", "in_progress", "late", "done"] as const;
export const listTasksQuerySchema = z.object({
  state: z.enum(TASK_FILTERS).default("all"),
  teamId: optional(64),
  q: optional(100),
  page: z.coerce.number().int().min(1).default(1),
});
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
