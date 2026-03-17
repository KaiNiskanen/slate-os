/* ──────────────────────────────────────────────
   Slate Novum -- OpenClaw follow-up queue
   Returns the compact due list for the next
   outreach window.
   ────────────────────────────────────────────── */

import type { NextRequest } from "next/server";

import { validateOpenClawRequest } from "../../../../lib/openclaw/auth";
import { err, ok } from "../../../../lib/openclaw/respond";
import { getAdminClient } from "../../../../lib/supabase-admin";

export async function GET(request: NextRequest) {
  const authError = validateOpenClawRequest(request);

  if (authError) {
    return authError;
  }

  const daysParam = request.nextUrl.searchParams.get("days");
  const statusParam = request.nextUrl.searchParams.get("status");
  const limitParam = request.nextUrl.searchParams.get("limit");

  const days = daysParam ? Number(daysParam) : 7;
  const limit = limitParam ? Number(limitParam) : 50;
  const statuses = statusParam
    ? statusParam
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : null;

  if (!Number.isFinite(days) || !Number.isFinite(limit)) {
    return err("days and limit must be numbers.", 400);
  }

  const adminClient = getAdminClient();
  const { data, error } = await adminClient.rpc("list_followups_due", {
    p_range_days: days,
    p_statuses: statuses,
    p_limit: limit,
  });

  if (error) {
    return err(error.message, 500);
  }

  return ok({
    leads: data ?? [],
    count: data?.length ?? 0,
  });
}
