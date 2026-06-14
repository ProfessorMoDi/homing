// First-name display gating for the *discovery* surface ("who is similar to
// you"). HOMING's posture is "Activity first. Profile never," so on discovery a
// person's first name is only shown once the viewer has opted in to sharing
// their own (reciprocal "share yours to see theirs"). Captured in onboarding
// as `shareNameWithSimilar`. Note: this does NOT apply to the group chat —
// sharing names with a matched + verified group is mandatory there.

export const ANON_MEMBER_LABEL = "HOMING member";

// Returns the first name when sharing is on, otherwise a neutral label.
// `share === null` (not yet asked) is treated as not shared.
export function sharedName(
  firstName: string | null | undefined,
  share: boolean | null,
  fallback: string = ANON_MEMBER_LABEL,
): string {
  if (share === true) {
    const name = firstName?.trim();
    if (name) return name;
  }
  return fallback;
}
