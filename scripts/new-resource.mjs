#!/usr/bin/env node
/**
 * Scaffold a new resource by copying the reference "items" slice and renaming it.
 *
 *   npm run new-resource -- <singular> <plural>
 *   npm run new-resource -- task tasks
 *   npm run new-resource -- booking bookings
 *
 * Copies schema, validation, service, API routes, pages, components, seeder and
 * tests, renaming item/items/Item/Items/ITEM(S) in file names and contents.
 * It never edits shared files; it prints the lines to add by hand. Then:
 *   1. edit the fields (schema + validation, keep in sync), form and list columns
 *   2. npm run db:generate && npm run db:migrate
 *   3. npm run check
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const [singular, plural] = process.argv.slice(2);
const NAME = /^[a-z][a-z0-9]*$/;
if (!singular || !plural || !NAME.test(singular) || !NAME.test(plural) || singular === plural) {
  console.error(
    "Usage: npm run new-resource -- <singular> <plural>   (lowercase letters/digits, e.g. task tasks)",
  );
  process.exit(1);
}
if (singular === "item" || plural === "items") {
  console.error("Choose a name other than item/items (that is the reference slice).");
  process.exit(1);
}

const cap = (s) => s[0].toUpperCase() + s.slice(1);
// Order matters: plural forms before singular ones.
const replacements = [
  ["ITEMS", plural.toUpperCase()],
  ["Items", cap(plural)],
  ["items", plural],
  ["ITEM", singular.toUpperCase()],
  ["Item", cap(singular)],
  ["item", singular],
];
const rename = (text) => replacements.reduce((acc, [from, to]) => acc.split(from).join(to), text);

const root = process.cwd();
const sources = [
  "src/lib/validation/items.ts",
  "src/lib/validation/items.test.ts",
  "src/server/db/schema/items.ts",
  "src/server/db/seeds/items.ts",
  "src/server/services/items.ts",
  "src/server/services/items.test.ts",
  "src/app/api/items",
  "src/app/app/items",
  "src/components/items",
  "tests/e2e/items.spec.ts",
];

function listFiles(rel) {
  const abs = path.join(root, rel);
  if (!existsSync(abs)) throw new Error(`Reference slice file missing: ${rel}`);
  if (statSync(abs).isFile()) return [rel];
  return readdirSync(abs).flatMap((name) => listFiles(path.join(rel, name)));
}

const plan = sources.flatMap(listFiles).map((from) => ({ from, to: rename(from) }));
const clash = plan.find(({ to }) => existsSync(path.join(root, to)));
if (clash) {
  console.error(`Refusing to overwrite existing file: ${clash.to}`);
  process.exit(1);
}

for (const { from, to } of plan) {
  const text = readFileSync(path.join(root, from), "utf8");
  mkdirSync(path.dirname(path.join(root, to)), { recursive: true });
  writeFileSync(path.join(root, to), rename(text));
  console.log(`  created ${to.split(path.sep).join("/")}`);
}

const Plural = cap(plural);
console.log(`
✓ ${Plural} resource scaffolded from the reference slice.

Add by hand (shared files):
  src/config/site.ts   nav:  { href: "/app/${plural}", label: "${Plural}", auth: true },
  src/server/db/seed.ts      import { seed${Plural} } from "./seeds/${plural}";
                             { name: "${plural}", run: seed${Plural} },

Next:
  1. Edit fields in src/server/db/schema/${plural}.ts AND src/lib/validation/${plural}.ts
     (then the form in src/components/${plural}/${singular}-form.tsx and the list columns).
  2. npm run db:generate && npm run db:migrate
  3. npm run check
  4. Not using "items"? Delete the reference slice (see docs/COMPETITION_ADAPTATION_GUIDE.md).
`);
