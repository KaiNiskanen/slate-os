/* ──────────────────────────────────────────────
   Slate Novum -- Supabase client (server-side)
   Used by Server Components and Server Actions.
   Browser requests use the anon key via RLS.
   ────────────────────────────────────────────── */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
