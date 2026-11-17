import { z } from "zod";

/**
 * Shared operations contracts (isomorphic). The engine only knows these generic
 * concepts; everything situation-specific (words, roles, categories) is data in
 * `OpsConfig`, saved on each operation at launch.
 */

/** Fixed internal permission levels. Permission checks use ONLY these ids. */
export const PERMISSION_LEVELS = ["organizer", "coordinator", "lead", "member"] as const;
export type PermissionLevel = (typeof PERMISSION_LEVELS)[number];

export const TASK_STATUSES = ["todo", "in_progress", "done", "blocked", "cancelled"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const ISSUE_STATUSES = ["open", "acknowledged", "resolved"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const PRIORITIES = ["normal", "high"] as const;
export const SEVERITIES = ["normal", "urgent"] as const;

/** Signals the command centre can show under "Needs attention", in config order. */
export const ATTENTION_SIGNALS = [
  "urgent_issues",
  "delayed_tasks",
  "open_issues",
  "unclaimed_tasks",
] as const;
export type AttentionSignal = (typeof ATTENTION_SIGNALS)[number];

const label = z.string().trim().min(1).max(40);

export const termsSchema = z.object({
  participant: label,
  participants: label,
  team: label,
  teams: label,
  location: label,
  locations: label,
  task: label,
  tasks: label,
  issue: label,
  issues: label,
});
export type OpsTerms = z.infer<typeof termsSchema>;

/** Labels exist for exactly the four fixed levels; no custom levels are accepted. */
export const roleLabelsSchema = z.strictObject({
  organizer: label,
  coordinator: label,
  lead: label,
  member: label,
});
export type RoleLabels = z.infer<typeof roleLabelsSchema>;

export const opsConfigSchema = z.object({
  terms: termsSchema,
  roleLabels: roleLabelsSchema,
  taskCategories: z.array(label).max(20),
  issueCategories: z.array(label).min(1).max(20),
  attention: z.array(z.enum(ATTENTION_SIGNALS)).min(1).max(ATTENTION_SIGNALS.length),
});
export type OpsConfig = z.infer<typeof opsConfigSchema>;

/** Neutral defaults used when nothing more specific is known. */
export const DEFAULT_TERMS: OpsTerms = {
  participant: "Member",
  participants: "Members",
  team: "Team",
  teams: "Teams",
  location: "Location",
  locations: "Locations",
  task: "Task",
  tasks: "Tasks",
  issue: "Problem",
  issues: "Problems",
};
