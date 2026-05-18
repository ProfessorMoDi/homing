"use client";

// Module-level cache for AI-generated activity suggestions, keyed on a
// signature derived from the topic input. Persists across navigations within
// the same SPA session so going back to /themes never re-fetches the same
// input, and survives React Strict Mode's double mount.

export interface RawSuggestedActivity {
  title: string;
  description: string;
  day: string;
  time: string;
  duration: string;
  location_area: string;
  exact_venue: string;
  group_size_target: number;
  language: string;
  energy_level: string;
  specific_interest_tags: string[];
  broader_interest_tags: string[];
  reason: string;
}

interface TopicLike {
  title: string;
  tags: string[];
}

export function topicSignature(topics: TopicLike[]): string {
  const norm = topics
    .map((t) => ({
      title: (t.title ?? "").toLowerCase().trim(),
      tags: [...(t.tags ?? [])].map((x) => x.toLowerCase()).sort(),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
  return JSON.stringify(norm);
}

const cache = new Map<string, RawSuggestedActivity[]>();
const inflight = new Map<string, Promise<RawSuggestedActivity[]>>();

export function hasCached(sig: string): boolean {
  return cache.has(sig);
}

export function getCached(
  sig: string,
): RawSuggestedActivity[] | undefined {
  return cache.get(sig);
}

// Returns the cached promise if a request is already in flight for this
// signature, so React Strict Mode's double mount only fires the network call
// once.
export function getOrFetchSuggestions(
  sig: string,
  fetcher: () => Promise<RawSuggestedActivity[]>,
): Promise<RawSuggestedActivity[]> {
  const cached = cache.get(sig);
  if (cached) return Promise.resolve(cached);

  const existing = inflight.get(sig);
  if (existing) return existing;

  const promise = fetcher()
    .then((activities) => {
      cache.set(sig, activities);
      inflight.delete(sig);
      return activities;
    })
    .catch((err) => {
      inflight.delete(sig);
      throw err;
    });

  inflight.set(sig, promise);
  return promise;
}
