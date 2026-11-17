import type { SetupDraft, SetupSuggestion } from "@/lib/ops/setup";
import { FALLBACK_PACK_ID, SCENARIO_PACKS } from "@/lib/ops/scenarios/packs";
import type { ScenarioPack } from "@/lib/ops/scenarios/types";

/**
 * Scenario engine: description → recognise → extract → instantiate.
 * Generic over packs: it never checks which pack it is using.
 * Pure and deterministic (no AI, no network), so it always works.
 */

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  fifteen: 15,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  hundred: 100,
};

/** Generic words that, after a number, mean "how many places". */
const PLACE_WORDS = [
  "locations",
  "location",
  "venues",
  "venue",
  "halls",
  "hall",
  "rooms",
  "room",
  "zones",
  "zone",
  "wards",
  "ward",
  "sites",
  "site",
  "stages",
  "stage",
  "areas",
  "area",
  "centres",
  "centers",
  "villages",
  "camps",
  "blocks",
  "gates",
  "points",
];

export function getPack(id: string | undefined): ScenarioPack | undefined {
  return SCENARIO_PACKS.find((p) => p.id === id);
}

function normalize(text: string) {
  return ` ${text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()} `;
}

/** Scores every pack by keyword hits. Returns packs with a score, best first. */
export function recognise(situation: string): Array<{ pack: ScenarioPack; score: number }> {
  const text = normalize(situation);
  return SCENARIO_PACKS.map((pack) => ({
    pack,
    score: pack.keywords.reduce((sum, k) => {
      const word = normalize(k);
      // Whole-word match, allowing a plural "s".
      return text.includes(word) || text.includes(`${word.trimEnd()}s `) ? sum + 1 : sum;
    }, 0),
  }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** Finds "<number> [adjective] <noun>" for any of `nouns`. */
export function extractCount(situation: string, nouns: string[]): number | undefined {
  const text = normalize(situation);
  const numberPattern = `(\\d{1,4}|${Object.keys(NUMBER_WORDS).join("|")})`;
  const nounPattern = nouns.map((n) => n.replace(/[^a-z ]/g, "")).join("|");
  const re = new RegExp(` ${numberPattern} (?:[a-z]+ )?(?:${nounPattern}) `);
  const match = text.match(re);
  if (!match) return undefined;
  const raw = match[1];
  const value = /^\d+$/.test(raw) ? Number(raw) : NUMBER_WORDS[raw];
  return value > 0 ? value : undefined;
}

function fill(template: string, location?: string) {
  return location ? template.replaceAll("{location}", location) : template;
}

export function instantiate(
  pack: ScenarioPack,
  situation: string,
  startsAt?: string,
): { draft: SetupDraft; assumptions: string[] } {
  const assumptions: string[] = [];

  const placeCount = extractCount(situation, PLACE_WORDS);
  const count = Math.min(placeCount ?? pack.locations.defaultCount, pack.locations.max);
  const { terms } = pack.config;
  if (placeCount === undefined) {
    assumptions.push(
      `We assumed ${count} ${count === 1 ? terms.location.toLowerCase() : terms.locations.toLowerCase()}. Add or remove them below.`,
    );
  } else if (placeCount > pack.locations.max) {
    assumptions.push(
      `We created the first ${count} ${terms.locations.toLowerCase()}; add more after launch.`,
    );
  }

  const headcount = extractCount(situation, pack.headcountWords);
  if (headcount !== undefined) {
    assumptions.push(
      `About ${headcount} ${terms.participants.toLowerCase()}: they join with the link and choose their ${terms.team.toLowerCase()}.`,
    );
  } else {
    assumptions.push(
      `${terms.participants} join with the link or QR code and choose their ${terms.team.toLowerCase()}.`,
    );
  }

  if (!startsAt) {
    assumptions.push("No start time given, so tasks have no due times yet.");
  }

  const fixed = pack.locations.fixed.map((name, i) => ({ key: `f${i}`, name }));
  const generated = Array.from({ length: count }, (_, i) => ({
    key: `l${i + 1}`,
    name: pack.locations.pattern.replace("{n}", String(i + 1)),
  }));
  const locations = [...fixed, ...generated];

  const teams: SetupDraft["teams"] = [];
  const tasks: SetupDraft["tasks"] = [];

  pack.teams.forEach((bp, bi) => {
    const places = bp.perLocation
      ? generated
      : [bp.fixedLocation !== undefined ? fixed[bp.fixedLocation] : undefined];
    places.forEach((place, pi) => {
      const teamKey = `t${bi}_${pi}`;
      teams.push({
        key: teamKey,
        name: fill(bp.name, place?.name),
        purpose: bp.purpose ? fill(bp.purpose, place?.name) : undefined,
        locationKey: place?.key,
      });
      for (const t of bp.tasks) {
        tasks.push({
          title: t.title,
          instructions: t.instructions,
          category: t.category,
          priority: t.priority ?? "normal",
          teamKey,
          locationKey: place?.key,
          offsetMinutes: t.offsetMinutes,
        });
      }
    });
  });

  return {
    draft: {
      name: pack.defaultName,
      situation,
      templateId: pack.id,
      startsAt,
      config: structuredClone(pack.config),
      locations,
      teams,
      tasks,
    },
    assumptions,
  };
}

/** Full pipeline used by the "Suggest a setup" button. */
export function suggestSetup(input: {
  situation: string;
  packId?: string;
  startsAt?: string;
}): SetupSuggestion {
  const matches = recognise(input.situation);
  const forced = getPack(input.packId);
  const pack = forced ?? matches[0]?.pack ?? getPack(FALLBACK_PACK_ID)!;

  const { draft, assumptions } = instantiate(pack, input.situation, input.startsAt);
  if (!forced && matches.length === 0) {
    assumptions.unshift(
      "We didn't recognise a specific kind of situation, so this is a general setup.",
    );
  }

  const alternatives = SCENARIO_PACKS.filter((p) => p.id !== pack.id).map((p) => ({
    id: p.id,
    name: p.name,
  }));

  return {
    draft,
    pack: { id: pack.id, name: pack.name },
    alternatives,
    assumptions,
    source: "template",
  };
}
