/* ──────────────────────────────────────────────
   Slate Novum -- OpenClaw lead search
   Returns a compact search result set for the
   agent without exposing raw table access.
   ────────────────────────────────────────────── */

import type { NextRequest } from "next/server";

import { validateOpenClawRequest } from "../../../../lib/openclaw/auth";
import { err, ok } from "../../../../lib/openclaw/respond";
import { getAdminClient } from "../../../../lib/supabase-admin";

export async function POST(request: NextRequest) {
  const authError = validateOpenClawRequest(request);

  if (authError) {
    return authError;
  }

  try {
    const body = (await request.json()) as {
      query?: string;
      status?: string;
      niche?: string;
      limit?: number;
    };

    const adminClient = getAdminClient();
    const limit = Number.isFinite(body.limit) ? Number(body.limit) : 20;
    const { data, error } = await adminClient.rpc("search_leads_compact", {
      p_query: body.query?.trim() || null,
      p_status: body.status?.trim() || null,
      p_niche: body.niche?.trim() || null,
      p_limit: limit,
    });

    if (error) {
      return err(error.message, 500);
    }

    return ok({
      leads: data ?? [],
      count: data?.length ?? 0,
    });
  } catch {
    return err("Invalid JSON body.", 400);
  }
}
