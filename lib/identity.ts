// First-name display gating. HOMING's posture is "Activity first. Profile
// never," so a person's first name is only shown once the viewer has chosen to
// share their own (reciprocal "share yours to see theirs"). The consent is
// captured in the chat window and stored as `shareFirstName` on app state.

export const ANON_MEMBER_LABEL = "HOMING member";
export const ANON_SENDER_LABEL = "Someone";

// Returns the first name when sharing is on, otherwise a neutral label.
// `shareFirstName === null` (not yet asked) is treated as not shared.
export function sharedName(
  firstName: string | null | undefined,
  shareFirstName: boolean | null,
  fallback: string = ANON_MEMBER_LABEL,
): string {
  if (shareFirstName === true) {
    const name = firstName?.trim();
    if (name) return name;
  }
  return fallback;
}
