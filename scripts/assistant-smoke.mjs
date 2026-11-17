#!/usr/bin/env node
/**
 * REAL inference smoke test for the website assistant (no mocks).
 * Sends real questions to a running app, which calls the configured provider.
 *
 *   npm run dev                         # with AI_PROVIDER configured in .env.local
 *   npm run assistant:smoke             # default http://localhost:3000, site malabar-spice
 *   npm run assistant:smoke -- http://localhost:3000 malabar-spice
 *
 * Prints each answer, its sources, provider/model and timing. Exit code 1 if any
 * request fails. Content checks are deliberately loose (model wording varies);
 * read the printed answers to judge quality.
 */
const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const siteId = process.argv[3] ?? "malabar-spice";

const cases = [
  {
    name: "general knowledge",
    message: "In two sentences: why does the sky look blue?",
    page: { path: "/demo", title: "Home" },
    expect: { anyOf: ["scatter", "rayleigh", "wavelength", "light"] },
  },
  {
    name: "website-specific (retrieval)",
    message: "What is your return policy?",
    page: { path: "/demo", title: "Home" },
    expect: { anyOf: ["7 days", "seven days", "unopened"], source: "shipping-returns" },
  },
  {
    name: "follow-up continuity",
    message: "What about damaged products?",
    followUp: true,
    page: { path: "/demo/shipping-returns", title: "Shipping & returns" },
    expect: { anyOf: ["48 hours", "photo", "replacement"], source: "damaged" },
  },
  {
    name: "page awareness",
    message: "How much does this cost?",
    page: {
      path: "/demo/products/green-cardamom",
      title: "Green Cardamom (8 mm)",
      content: "Green Cardamom (8 mm) ₹420 for 100 g",
    },
    expect: { anyOf: ["420"] },
  },
  {
    name: "Malayalam",
    message: "കുരുമുളകിന്റെ വില എത്രയാണ്?",
    page: { path: "/demo", title: "Home" },
    expect: { anyOf: ["240"], malayalamReply: true },
  },
];

async function ask(message, history, page) {
  const started = Date.now();
  const res = await fetch(`${base}/api/assistant/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ siteId, message, history, page }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let meta = null;
  let firstTokenMs = null;
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let i;
    while ((i = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, i);
      buffer = buffer.slice(i + 1);
      if (!line.trim()) continue;
      const event = JSON.parse(line);
      if (event.type === "meta") meta = event;
      if (event.type === "delta") {
        firstTokenMs ??= Date.now() - started;
        text += event.text;
      }
      if (event.type === "error") throw new Error(`${event.code}: ${event.message}`);
    }
  }
  return { text, meta, ms: Date.now() - started, firstTokenMs };
}

let failures = 0;
let history = [];
for (const c of cases) {
  const h = c.followUp ? history : [];
  process.stdout.write(`\n=== ${c.name} ===\nQ: ${c.message}\n`);
  try {
    const r = await ask(c.message, h, c.page);
    const lower = r.text.toLowerCase();
    const hit = c.expect.anyOf.some((w) => lower.includes(w.toLowerCase()));
    const sourceHit =
      !c.expect.source ||
      (r.meta?.sources ?? []).some((s) => (s.id + (s.url ?? "")).includes(c.expect.source));
    const ml = !c.expect.malayalamReply || /[ഀ-ൿ]/.test(r.text);
    console.log(`A: ${r.text.trim()}`);
    console.log(
      `   provider=${r.meta?.provider} model=${r.meta?.model} first-token=${r.firstTokenMs}ms total=${r.ms}ms`,
    );
    console.log(`   sources: ${(r.meta?.sources ?? []).map((s) => s.id).join(", ") || "(none)"}`);
    console.log(
      `   checks: keyword=${hit ? "ok" : "MISSING"} source=${sourceHit ? "ok" : "MISSING"} malayalam=${ml ? "ok" : "MISSING"}`,
    );
    if (!hit || !sourceHit || !ml) failures++;
    history = [...h, { role: "user", content: c.message }, { role: "assistant", content: r.text }];
  } catch (error) {
    failures++;
    console.log(`FAILED: ${error.message}`);
  }
}
console.log(`\n${cases.length - failures}/${cases.length} cases passed their checks.`);
process.exit(failures ? 1 : 0);
