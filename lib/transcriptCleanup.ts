// Light post-STT cleanup before LLM analyze. Fixes common proper nouns and
// disfluencies without changing meaning.

const REPLACEMENTS: [RegExp, string][] = [
  [/\berasmus university rotterdam\b/gi, "Erasmus University Rotterdam"],
  [/\beur campus\b/gi, "EUR campus"],
  [/\bkralingen\b/gi, "Kralingen"],
  [/\bdelfshaven\b/gi, "Delfshaven"],
  [/\bhillegersberg\b/gi, "Hillegersberg"],
  [/\bkralingse bos\b/gi, "Kralingse Bos"],
  [/\bsettlers of catan\b/gi, "Settlers of Catan"],
  [/\bcatan\b/gi, "Catan"],
  [/\bticket to ride\b/gi, "Ticket to Ride"],
  [/\brotterdam\b/gi, "Rotterdam"],
  [/\buh+\b/gi, ""],
  [/\bum+\b/gi, ""],
  [/\blike,\s*/gi, ""],
  [/\s{2,}/g, " "],
];

export function cleanupTranscript(raw: string): string {
  let t = raw.trim();
  for (const [re, rep] of REPLACEMENTS) {
    t = t.replace(re, rep);
  }
  return t.replace(/\s+([,.!?])/g, "$1").trim();
}
