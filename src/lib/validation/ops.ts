import { z } from "zod";
import { SEVERITIES } from "@/lib/ops/types";

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
