#!/usr/bin/env node
/**
 * Full archetype eval against /api/analyze
 * Usage: node scripts/eval-analyze-full.mjs [baseUrl]
 */

const base = process.argv[2] ?? "http://localhost:3457";

const CASES = [
  {
    id: "board-games",
    transcript:
      "Honestly the thing I keep coming back to is Catan. I used to play it constantly back home and I miss the slow Thursday evening vibe of just sitting around the board with snacks. I'm in Kralingen so anywhere near the EUR campus is easy for me. I'd want it small, like four people, English is fine but German also works. Low-pressure, just one round to see how it feels. On weekends I also like wandering around with my camera doing photography — not anything intense, just walking and looking for nice light.",
    expectTopics: ["Catan", "Photography"],
    expectLangs: ["English", "German"],
    minTopics: 2,
    minActivities: 2,
  },
  {
    id: "photo-walks",
    transcript:
      "I think what I'm actually craving is just slow Saturdays. I picked up a film camera last year and I love wandering through Rotterdam looking for interesting buildings and side streets. Kralingse Bos when the light is good, or the harbour at golden hour. I'd love to do it with two or three other people who don't mind walking quietly for an hour. I speak Dutch and English, comfortable in both. Coffee after is a bonus, not the point. Weekends only, weekdays are full with classes.",
    expectTopics: ["Film", "walk"],
    expectLangs: ["Dutch", "English"],
    minTopics: 2,
    minActivities: 2,
  },
  {
    id: "running",
    transcript:
      "I run a lot, mostly along the Maas in the early mornings before classes. I'd love to find one or two people who can keep a steady 5km pace, nothing too fast. Tuesdays and Thursdays at like 7am would be perfect. I'm in Noord so meeting at the Erasmusbrug works. After running I usually grab a coffee and a baguette somewhere, that's the social part for me. English only, my Dutch is still rough. Open to making it a regular thing if the energy is right.",
    expectTopics: ["Running", "Coffee"],
    expectLangs: ["English"],
    minTopics: 2,
    minActivities: 2,
  },
  {
    id: "music-production",
    transcript:
      "I make techno in Ableton, mostly alone in my room and it's getting boring. I'd love to find two or three people who also produce, even at very different levels, just to share what we're working on. Friday afternoons would be ideal, somewhere with monitors or just listening on headphones together. I'm in Delfshaven near WORM, that area is full of studios. English works, French if anyone speaks it. Not a jam, more a 'show me what you're working on and let's talk it through' kind of session.",
    expectTopics: ["Music", "Techno"],
    expectLangs: ["English"],
    minTopics: 2,
    minActivities: 2,
  },
  {
    id: "cooking",
    transcript:
      "I love cooking but I rarely cook for more than myself, which feels like a waste. I'd want to find people who want to actually cook together — pick a cuisine, shop in the morning, cook in the afternoon, eat. Asian food especially, ramen, dumplings, that level of complexity. Saturdays. I have a decent kitchen in Centrum so we can do it at mine. Dutch, English, both fine. Honestly I just want the kitchen to feel like a place where things happen.",
    expectTopics: ["Cooking", "Asian"],
    expectLangs: ["Dutch", "English"],
    minTopics: 2,
    minActivities: 2,
  },
  {
    id: "language-silent",
    transcript:
      "I like board games and photography walks near campus on Thursdays. Small groups, low pressure. Near Kralingen.",
    expectTopics: ["board", "photography"],
    expectLangs: [],
    minTopics: 2,
    minActivities: 1,
    expectMissingLang: true,
  },
];

function titleMatch(topics, needle) {
  const n = needle.toLowerCase();
  return topics.some((t) => t.title.toLowerCase().includes(n));
}

function langMatch(langs, needle) {
  const n = needle.toLowerCase();
  return langs.some((l) => l.toLowerCase().includes(n));
}

async function runCase(c) {
  const t0 = Date.now();
  const r = await fetch(`${base}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript: c.transcript, phase: "full" }),
  });
  const ms = Date.now() - t0;
  const issues = [];

  if (!r.ok) {
    return { id: c.id, ok: false, ms, issues: [`HTTP ${r.status}: ${await r.text()}`] };
  }

  const data = await r.json();
  if (data.error) issues.push(`API error: ${data.error}`);

  const topics = data.topics ?? [];
  const activities = data.activities ?? [];
  const langs = data.languages ?? [];

  if (topics.length < c.minTopics)
    issues.push(`Only ${topics.length} topics (expected >= ${c.minTopics})`);
  if (activities.length < c.minActivities)
    issues.push(`Only ${activities.length} activities (expected >= ${c.minActivities})`);

  for (const exp of c.expectTopics ?? []) {
    if (!titleMatch(topics, exp))
      issues.push(`Missing expected topic containing "${exp}"`);
  }
  for (const exp of c.expectLangs ?? []) {
    if (!langMatch(langs, exp))
      issues.push(`Missing expected language "${exp}" (got: ${langs.join(", ") || "none"})`);
  }

  if (c.expectMissingLang) {
    if (!data.missing_fields?.includes("languages_comfortable"))
      issues.push(`Expected missing_fields languages_comfortable, got ${JSON.stringify(data.missing_fields)}`);
    if (data.language_confidence === "high")
      issues.push(`language_confidence should not be high without explicit languages`);
  }

  const noReason = activities.filter((a) => !a.reason?.trim()).length;
  if (noReason > 0) issues.push(`${noReason} activities missing reason`);

  const englishDefault = activities.filter(
    (a) => a.language === "English" && !langs.some((l) => l.toLowerCase().includes("english")),
  ).length;
  if (englishDefault > 0 && c.expectLangs?.length === 0)
    issues.push(`${englishDefault} activities default to English without language extraction`);

  const merged = topics.some(
    (t) =>
      t.title.toLowerCase().includes("catan") &&
      t.title.toLowerCase().includes("photography"),
  );
  if (merged) issues.push("Topics may be incorrectly merged");

  return {
    id: c.id,
    ok: issues.length === 0,
    ms,
    issues,
    summary: {
      topics: topics.length,
      activities: activities.length,
      langs: langs.join(", ") || "(none)",
      confidence: data.language_confidence,
      missing: (data.missing_fields ?? []).join(", "),
      reflection: (data.companion_reflection ?? "").slice(0, 80) + "...",
      topicTitles: topics.map((t) => t.title).join(" · "),
    },
  };
}

async function main() {
  console.log(`Evaluating ${CASES.length} cases against ${base}/api/analyze\n`);
  const results = [];
  for (const c of CASES) {
    const res = await runCase(c);
    results.push(res);
    const mark = res.ok ? "PASS" : "FAIL";
    console.log(`[${mark}] ${c.id} (${(res.ms / 1000).toFixed(1)}s)`);
    console.log(`  ${JSON.stringify(res.summary)}`);
    if (res.issues.length) res.issues.forEach((i) => console.log(`  ! ${i}`));
    console.log();
  }
  const passed = results.filter((r) => r.ok).length;
  console.log(`--- ${passed}/${results.length} passed ---`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
