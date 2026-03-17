/* ──────────────────────────────────────────────
   Slate Novum -- OpenClaw lead creation
   Uses an atomic RPC so duplicate prevention
   stays inside the database.
   ────────────────────────────────────────────── */

import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";

import { validateOpenClawRequest } from "../../../../lib/openclaw/auth";
import { err, ok } from "../../../../lib/openclaw/respond";
import { getAdminClient } from "../../../../lib/supabase-admin";

interface CreateLeadBody {
  company?: string;
  contact?: string;
  email?: string | null;
  niche?: string | null;
  website_url?: string | null;
  notes?: string | null;
}

export async function POST(request: NextRequest) {
  const authError = validateOpenClawRequest(request);

  if (authError) {
    return authError;
  }

  try {
    const body = (await request.json()) as CreateLeadBody;
    const company = body.company?.trim();
    const contact = body.contact?.trim();

    if (!company || !contact) {
      return err("Company and contact are required.", 400);
    }

    const adminClient = getAdminClient();
    const { data, error } = await adminClient.rpc("create_lead_if_not_exists", {
      p_company: company,
      p_contact: contact,
      p_email: body.email?.trim() || null,
      p_niche: body.niche?.trim() || null,
      p_website_url: body.website_url?.trim() || null,
      p_notes: body.notes?.trim() || null,
      p_source: "openclaw",
    });

    if (error) {
      return err(error.message, 500);
    }

    const result = data?.[0];

    if (!result) {
      return err("Create lead RPC returned no result.", 500);
    }

    // Refresh the leads page so successful OpenClaw inserts appear immediately.
    revalidatePath("/leads");

    return ok({
      status: result.status,
      lead_id: result.lead_id,
      company: result.company,
      contact: result.contact,
    });
  } catch {
    return err("Invalid JSON body.", 400);
  }
}
