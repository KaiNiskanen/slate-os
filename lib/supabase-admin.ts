/* ──────────────────────────────────────────────
   Slate Novum -- privileged Supabase client
   Used only by server-only OpenClaw routes.
   Never import this into client code.
   ────────────────────────────────────────────── */

import "server-only";

import { createClient } from "@supabase/supabase-js";

/** Build the service-role client only on the server, with clear env checks. */
export function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
