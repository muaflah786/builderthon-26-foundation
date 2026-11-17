import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { setupDraftSchema } from "@/lib/ops/setup";
import { extractCount, recognise, suggestSetup } from "@/lib/ops/scenarios/engine";
import { SCENARIO_PACKS } from "@/lib/ops/scenarios/packs";

const FESTIVAL =
  "We are organizing a college festival tomorrow. We have 40 volunteers, 5 departments, and 3 event locations.";
const EXAM = "University exam tomorrow at 10 am. 6 halls, 30 invigilators, 900 candidates.";
const FLOOD = "Flood in 3 wards since this morning. 25 responders, one relief camp at the school.";

describe("scenario engine", () => {
  it.each([
    [FESTIVAL, "festival", 3],
    [EXAM, "exam", 6],
    [FLOOD, "emergency", 3],
  ])("recognises %s", (text, packId, places) => {
    const s = suggestSetup({ situation: text });
    expect(s.pack.id).toBe(packId);
    // Every generated place (beyond the pack's fixed ones) exists.
    const pack = SCENARIO_PACKS.find((p) => p.id === packId)!;
    expect(s.draft.locations).toHaveLength(pack.locations.fixed.length + places);
    expect(() => setupDraftSchema.parse(s.draft)).not.toThrow();
    expect(s.draft.tasks.length).toBeGreaterThan(0);
  });

  it("gives each situation its own words and role labels from data", () => {
    const labels = [FESTIVAL, EXAM, FLOOD].map(
      (t) => suggestSetup({ situation: t }).draft.config.roleLabels.member,
    );
    expect(new Set(labels).size).toBe(3);
  });

  it("scales per-place teams to the number in the description", () => {
    const exam = suggestSetup({ situation: EXAM });
    expect(exam.draft.teams.filter((t) => /^Hall \d+$/.test(t.name))).toHaveLength(6);
  });

  it("falls back to a general setup for unknown situations and says so", () => {
    const s = suggestSetup({ situation: "Blood donation drive on Saturday, 15 helpers, 2 rooms." });
    expect(s.pack.id).toBe("general");
    expect(s.assumptions[0]).toMatch(/general setup/);
    expect(s.draft.locations).toHaveLength(1 + 2);
  });

  it("lets the organizer force another pack", () => {
    expect(suggestSetup({ situation: FESTIVAL, packId: "exam" }).pack.id).toBe("exam");
  });

  it("computes nothing about time when no start is given", () => {
    const s = suggestSetup({ situation: FLOOD });
    expect(s.assumptions.some((a) => a.includes("No start time"))).toBe(true);
  });

  it("extracts counts written as words and with an adjective", () => {
    expect(extractCount("three event venues", ["venues"])).toBe(3);
    expect(extractCount("40 student volunteers", ["volunteers"])).toBe(40);
    expect(extractCount("lots of people", ["people"])).toBeUndefined();
  });

  it("does not match keywords inside other words", () => {
    expect(recognise("an example of nothing").map((r) => r.pack.id)).not.toContain("exam");
  });
});

/** ONE PLATFORM, EVERY SITUATION: shared code must never branch on a pack id. */
describe("universality guard", () => {
  const ROOTS = [
    "src/server/services",
    "src/components/ops",
    "src/app/app/ops",
    "src/app/join",
    "src/app/api/ops",
    "src/server/db/schema",
  ];
  const ids = SCENARIO_PACKS.map((p) => p.id).filter((id) => id !== "general");

  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? files(path) : /\.tsx?$/.test(name) ? [path] : [];
    });
  }

  it("has no scenario ids in shared engine, UI or API code", () => {
    const offenders: string[] = [];
    for (const file of ROOTS.flatMap(files)) {
      const text = readFileSync(file, "utf8");
      for (const id of ids)
        if (text.includes(`"${id}"`) || text.includes(`'${id}'`)) offenders.push(`${file}: ${id}`);
    }
    expect(offenders).toEqual([]);
  });
});
