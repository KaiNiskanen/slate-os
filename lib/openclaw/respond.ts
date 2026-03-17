/* ──────────────────────────────────────────────
   Slate Novum -- OpenClaw JSON responses
   Small helpers keep route handlers compact
   and response shapes consistent.
   ────────────────────────────────────────────── */

import { NextResponse } from "next/server";

/** Return a standard success payload. */
export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

/** Return a standard error payload. */
export function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
