import { NextRequest, NextResponse } from "next/server";
import {
  authUserExists,
  isAdminConfigured,
  upsertAuthUser,
} from "../../../../lib/firebaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 15;

// Firebase Auth account management via the Admin SDK.
//
//   GET  ?email=…              → { exists } — authoritative existence check
//                                (works with email enumeration protection on).
//   POST { email, first_name } → creates the Auth user if missing and sets its
//                                display name, so a signup writes a real
//                                account immediately rather than only when the
//                                magic-link email is clicked.
//
// `configured` is returned so the client can tell "no account" apart from
// "admin not set up on this deployment" and degrade gracefully.

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }
  const exists = await authUserExists(email);
  return NextResponse.json({ exists, configured: await isAdminConfigured() });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    email?: string;
    first_name?: string;
  } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }
  if (!(await isAdminConfigured())) {
    // No Admin SDK here — nothing to write. Report so the client can fall back
    // to the magic-link-only flow (account created on link click).
    return NextResponse.json({ ok: false, configured: false });
  }
  const uid = await upsertAuthUser({ email, displayName: body?.first_name });
  return NextResponse.json({ ok: uid !== null, configured: true, uid });
}
