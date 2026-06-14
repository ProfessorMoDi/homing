// Server-only request authorization for /api/neo4j/* routes that touch a
// specific user's personal data. Verifies the Firebase ID token sent in the
// Authorization header and maps it to the same `u_<slug>` id the client uses,
// so a route can enforce "you may only read/write your own record."

import type { NextRequest } from "next/server";
import { verifyIdToken } from "./firebaseAdmin";
import { resolveUserContext } from "./currentUser";

export interface AuthedUser {
  uid: string;
  email: string;
  /** The app's user-node id derived from the verified email (u_<slug>). */
  userId: string;
}

function bearer(req: NextRequest): string {
  const h = req.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : "";
}

/** Returns the authenticated user, or null when the token is missing/invalid
 *  (or the Admin SDK isn't configured). */
export async function authenticate(req: NextRequest): Promise<AuthedUser | null> {
  const token = bearer(req);
  if (!token) return null;
  const decoded = await verifyIdToken(token);
  const email = decoded?.email?.trim().toLowerCase();
  if (!decoded || !email) return null;
  return {
    uid: decoded.uid,
    email,
    userId: resolveUserContext({ email }).id,
  };
}

export type OwnerCheck =
  | { ok: true; user: AuthedUser }
  | { ok: false; status: 401 | 403 };

/** Authorize that the caller owns `targetId`. 401 when unauthenticated,
 *  403 when authenticated as someone else. */
export async function requireOwner(
  req: NextRequest,
  targetId: string,
): Promise<OwnerCheck> {
  const user = await authenticate(req);
  if (!user) return { ok: false, status: 401 };
  if (user.userId !== targetId) return { ok: false, status: 403 };
  return { ok: true, user };
}
