import { z } from "zod";
import { opsConfigSchema, PRIORITIES } from "@/lib/ops/types";

/**
 * The setup an organizer reviews and launches. Produced by the scenario engine
 * (or later by AI), edited in the review screen, and validated again on the
 * server before anything is written. Keys are temporary ids that link tasks and
 * teams to locations inside the draft.
 */

const key = z.string().trim().min(1).max(40);
const optional = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(max).optional(),
  );

export const draftLocationSchema = z.object({
  key,
  name: z.string().trim().min(1).max(80),
  directions: optional(300),
});

export const draftTeamSchema = z.object({
  key,
  name: z.string().trim().min(1).max(80),
  purpose: optional(300),
  locationKey: key.optional(),
});

export const draftTaskSchema = z.object({
  title: z.string().trim().min(1).max(160),
  instructions: optional(1000),
  category: optional(40),
  priority: z.enum(PRIORITIES).default("normal"),
  teamKey: key.optional(),
  locationKey: key.optional(),
  /** Minutes relative to the operation start (negative = before). */
  offsetMinutes: z
    .number()
    .int()
    .min(-7 * 24 * 60)
    .max(7 * 24 * 60)
    .optional(),
});

export const setupDraftSchema = z.object({
  name: z.string().trim().min(1, "Give the operation a name").max(120),
  situation: z.string().trim().min(1).max(4000),
  templateId: z.string().max(40).nullable(),
  /** ISO date-time of the start, if known. Task due times are computed from it. */
  startsAt: z.iso.datetime({ offset: true }).optional(),
  config: opsConfigSchema,
  locations: z.array(draftLocationSchema).max(60),
  teams: z.array(draftTeamSchema).min(1, "Keep at least one team").max(60),
  tasks: z.array(draftTaskSchema).max(300),
});

export type SetupDraft = z.infer<typeof setupDraftSchema>;
export type SetupDraftInput = z.input<typeof setupDraftSchema>;

export const suggestSetupSchema = z.object({
  situation: z.string().trim().min(3, "Describe the situation in a few words").max(4000),
  /** Force a specific pack (from the "Not quite right?" choices). */
  packId: z.string().max(40).optional(),
  startsAt: z.iso.datetime({ offset: true }).optional(),
});
export type SuggestSetupInput = z.infer<typeof suggestSetupSchema>;

export type SetupSuggestion = {
  draft: SetupDraft;
  pack: { id: string; name: string };
  /** Other situations that also matched, offered as one-tap alternatives. */
  alternatives: Array<{ id: string; name: string }>;
  /** Plain-language assumptions shown as "We assumed…" notes. */
  assumptions: string[];
  /** Where the suggestion came from (shown on the review screen). */
  source: "template";
};
