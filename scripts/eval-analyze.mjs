#!/usr/bin/env node
/**
 * Manual eval: POST each archetype transcript to /api/analyze and print a
 * short checklist. Run with dev server up:
 *   node scripts/eval-analyze.mjs
 *   node scripts/eval-analyze.mjs http://localhost:3000
 */

const base = process.argv[2] ?? "http://localhost:3000";

const VARIANTS = {
  "board-games": `Honestly the thing I keep coming back to is Catan. I used to play it constantly back home and I miss the slow Thursday evening vibe of just sitting around the board with snacks. I'm in Kralingen so anywhere near the EUR campus is easy for me. I'd want it small, like four people, English is fine but German also works. Low-pressure, just one round to see how it feels. On weekends I also like wandering around with my camera doing photography — not anything intense, just walking and looking for nice light.`,
  "photo-walks": `I think what I'm actually craving is just slow Saturdays. I picked up a film camera last year and I love wandering through Rotterdam looking for interesting buildings and side streets. Kralingse Bos when the light is good, or the harbour at golden hour. I'd love to do it with two or three other people who don't mind walking quietly for an hour. I speak Dutch and English, comfortable in both. Coffee after is a bonus, not the point. Weekends only, weekdays are full with classes.`,
};

async function run(id, transcript) {
  const r = await fetch(`${base}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript }),
  });
  if (!r.ok) {
    console.log(`\n[${id}] FAIL ${r.status}`, await r.text());
    return;
  }
  const data = await r.json();
  console.log(`\n=== ${id} ===`);
  console.log(`topics: ${data.topics?.length ?? 0}`);
  console.log(`activities: ${data.activities?.length ?? 0}`);
  console.log(`languages: ${(data.languages ?? []).join(", ") || "(none)"}`);
  console.log(`language_confidence: ${data.language_confidence}`);
  console.log(`missing_fields: ${(data.missing_fields ?? []).join(", ")}`);
  if (data.topics?.length) {
    console.log(`topic titles: ${data.topics.map((t) => t.title).join(" · ")}`);
  }
  const withReason = (data.activities ?? []).filter((a) => a.reason?.length > 0);
  console.log(`activities with reason: ${withReason.length}/${data.activities?.length ?? 0}`);
}

async function main() {
  for (const [id, transcript] of Object.entries(VARIANTS)) {
    await run(id, transcript);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
