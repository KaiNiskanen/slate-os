/* ──────────────────────────────────────────────
   Slate Novum -- OpenClaw API auth
   Keeps the agent surface behind a single
   server-only bearer token.
   ────────────────────────────────────────────── */

import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** Validate the OpenClaw bearer token before any privileged route runs. */
export function validateOpenClawRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const expectedToken = process.env.OPENCLAW_API_SECRET?.trim();

  if (!expectedToken) {
    return NextResponse.json(
      { error: "Server is missing OPENCLAW_API_SECRET." },
      { status: 500 }
    );
  }

  if (!token || token !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return null;
}
