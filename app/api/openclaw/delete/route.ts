/* ──────────────────────────────────────────────
   Slate Novum -- OpenClaw lead deletion
   Supports exact single deletes plus guarded
   bulk cleanup for bad agent inserts.
   ────────────────────────────────────────────── */

import type { NextRequest } from "next/server";

import { validateOpenClawRequest } from "../../../../lib/openclaw/auth";
import { normalizeContact } from "../../../../lib/openclaw/normalize";
import { err, ok } from "../../../../lib/openclaw/respond";
import { getAdminClient } from "../../../../lib/supabase-admin";
import type { SourceValue } from "../../../../lib/types";

interface DeleteLeadBody {
  id?: string;
  lead_id?: string;
  ids?: string[];
  company?: string;
  contact?: string;
  companies?: string[];
  source?: SourceValue | null;
}

/** Return the first non-empty trimmed string value from supported aliases. */
function pickFirstFilledValue(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const trimmed = value?.trim();

    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

/** Trim, de-duplicate, and discard blank values from array input. */
function normalizeStringList(values: string[] | undefined) {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );
}

export async function POST(request: NextRequest) {
  const authError = validateOpenClawRequest(request);

  if (authError) {
    return authError;
  }

  try {
    const body = (await request.json()) as DeleteLeadBody;
    const singleLeadId = pickFirstFilledValue(body.lead_id, body.id);
    const ids = normalizeStringList(body.ids);
    const company = body.company?.trim() || null;
    const contact = body.contact?.trim() || null;
    const companies = normalizeStringList(body.companies);
    const source = body.source?.trim() || null;
    const modeCount = [
      Boolean(singleLeadId),
      ids.length > 0,
      Boolean(company && contact),
      companies.length > 0,
    ].filter(Boolean).length;

    // Force one exact deletion mode so the agent cannot send ambiguous selectors.
    if (modeCount !== 1) {
      return err(
        "Provide exactly one selector: lead_id/id, ids, company+contact, or companies.",
        400
      );
    }

    const adminClient = getAdminClient();

    if (singleLeadId) {
      const { data, error } = await adminClient
        .from("leads")
        .delete()
        .eq("id", singleLeadId)
        .select("id, company, contact")
        .limit(1);

      if (error) {
        return err(error.message, 500);
      }

      if (!data || data.length === 0) {
        return err("Lead not found.", 404);
      }

      return ok({
        status: "deleted",
        lead_id: data[0].id,
        company: data[0].company,
        contact: data[0].contact,
      });
    }

    if (ids.length > 0) {
      const { data, error } = await adminClient
        .from("leads")
        .delete()
        .in("id", ids)
        .select("id, company, contact");

      if (error) {
        return err(error.message, 500);
      }

      if (!data || data.length === 0) {
        return err("No matching leads found.", 404);
      }

      return ok({
        status: "deleted",
        count: data.length,
        lead_ids: data.map((lead) => lead.id),
        leads: data,
      });
    }

    if (company && contact) {
      const { data, error } = await adminClient
        .from("leads")
        .delete()
        .eq("company", company)
        .eq("contact_norm", normalizeContact(contact))
        .select("id, company, contact")
        .limit(1);

      if (error) {
        return err(error.message, 500);
      }

      if (!data || data.length === 0) {
        return err("Lead not found.", 404);
      }

      return ok({
        status: "deleted",
        lead_id: data[0].id,
        company: data[0].company,
        contact: data[0].contact,
      });
    }

    // Bulk company deletes stay exact-match only, with optional source scoping.
    let query = adminClient
      .from("leads")
      .delete()
      .in("company", companies)
      .select("id, company, contact, source");

    if (source) {
      query = query.eq("source", source);
    }

    const { data, error } = await query;

    if (error) {
      return err(error.message, 500);
    }

    if (!data || data.length === 0) {
      return err("No matching leads found.", 404);
    }

    return ok({
      status: "deleted",
      count: data.length,
      lead_ids: data.map((lead) => lead.id),
      leads: data,
    });
  } catch {
    return err("Invalid JSON body.", 400);
  }
}
