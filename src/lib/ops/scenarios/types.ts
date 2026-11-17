import type { OpsConfig } from "@/lib/ops/types";

/**
 * A scenario pack: a STARTING POINT expressed as data. The engine never branches
 * on a pack id; it only reads these fields. Add a situation = add one pack file.
 */

export type TaskBlueprint = {
  title: string;
  instructions?: string;
  category?: string;
  priority?: "normal" | "high";
  /** Minutes from the operation start (negative = before). */
  offsetMinutes?: number;
};

export type TeamBlueprint = {
  /** May contain "{location}" when `perLocation` is true. */
  name: string;
  purpose?: string;
  /** One team per generated location (e.g. one per hall or zone). */
  perLocation?: boolean;
  /** Index into `locations.fixed` for teams based at a fixed place. */
  fixedLocation?: number;
  tasks: TaskBlueprint[];
};

export type ScenarioPack = {
  id: string;
  /** Shown on quick-pick chips and in "Not quite right?" alternatives. */
  name: string;
  /** Example description shown as a placeholder. */
  example: string;
  /** Lower-case words/phrases that suggest this situation. */
  keywords: string[];
  defaultName: string;
  config: OpsConfig;
  locations: {
    /** Name for generated locations; "{n}" is replaced with 1, 2, 3… */
    pattern: string;
    defaultCount: number;
    max: number;
    /** Places that always exist (control room, relief camp…). */
    fixed: string[];
  };
  /** Words that, after a number, mean "how many people" (e.g. "40 volunteers"). */
  headcountWords: string[];
  teams: TeamBlueprint[];
};
