/* ──────────────────────────────────────────────
   Slate Novum -- OpenClaw lead updates
   Validates a bounded patch shape and logs
   operational events for agent-made changes.
   ────────────────────────────────────────────── */

import type { NextRequest } from "next/server";

import { STATUS_OPTIONS } from "../../../../lib/constants";
import { validateOpenClawRequest } from "../../../../lib/openclaw/auth";
import {
  extractDomain,
  normalizeContact,
  normalizeEmail,
} from "../../../../lib/openclaw/normalize";
import { err, ok } from "../../../../lib/openclaw/respond";
import { getAdminClient } from "../../../../lib/supabase-admin";
import type { EventType, StatusValue } from "../../../../lib/types";

interface UpdateLeadBody {
  lead_id?: string;
  status?: StatusValue;
  next_followup?: string | null;
  niche?: string | null;
  email?: string | null;
  website_url?: string | null;
  notes?: string | null;
  contact?: string | null;
}

function hasField<T extends object>(value: T, key: keyof T) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export async function PATCH(request: NextRequest) {
  const authError = validateOpenClawRequest(request);

  if (authError) {
    return authError;
  }

  try {
    const body = (await request.json()) as UpdateLeadBody;
    const leadId = body.lead_id?.trim();

    if (!leadId) {
      return err("lead_id is required.", 400);
    }

    if (hasField(body, "status")) {
      if (!body.status || !STATUS_OPTIONS.includes(body.status)) {
        return err("Invalid status.", 400);
      }
    }

    const adminClient = getAdminClient();
    const { data: currentLead, error: currentLeadError } = await adminClient
      .from("leads")
      .select("id, status, contact, next_followup, notes, email, niche, website_url")
      .eq("id", leadId)
      .single();

    if (currentLeadError || !currentLead) {
      return err("Lead not found.", 404);
    }

    const updates: Record<string, string | null> = {};

    if (hasField(body, "status")) {
      updates.status = body.status!;
    }

    if (hasField(body, "next_followup")) {
      updates.next_followup = body.next_followup?.trim() || null;
    }

    if (hasField(body, "niche")) {
      updates.niche = body.niche?.trim() || null;
    }

    if (hasField(body, "email")) {
      const email = body.email?.trim() || null;
      updates.email = email;
      updates.email_norm = email ? normalizeEmail(email) : null;
    }

    if (hasField(body, "website_url")) {
      const websiteUrl = body.website_url?.trim() || null;
      updates.website_url = websiteUrl;
      updates.website_domain_norm = websiteUrl ? extractDomain(websiteUrl) : null;
    }

    if (hasField(body, "notes")) {
      updates.notes = body.notes?.trim() || null;
    }

    if (hasField(body, "contact")) {
      const contact = body.contact?.trim();

      if (!contact) {
        return err("Contact cannot be empty.", 400);
      }

      updates.contact = contact;
      updates.contact_norm = normalizeContact(contact);
    }

    if (Object.keys(updates).length === 0) {
      return err("No supported fields provided.", 400);
    }

    const { error: updateError } = await adminClient
      .from("leads")
      .update(updates)
      .eq("id", leadId);

    if (updateError) {
      const statusCode =
        updateError.message.includes("leads_contact_norm_key") ? 409 : 500;

      return err(updateError.message, statusCode);
    }

    const events: {
      lead_id: string;
      event_type: EventType;
      actor_type: "openclaw";
      payload_json: Record<string, unknown>;
    }[] = [];

    if (
      hasField(body, "status") &&
      body.status &&
      body.status !== "new" &&
      body.status !== currentLead.status
    ) {
      events.push({
        lead_id: leadId,
        event_type: body.status as EventType,
        actor_type: "openclaw",
        payload_json: {
          from: currentLead.status,
          to: body.status,
        },
      });
    }

    if (
      hasField(body, "next_followup") &&
      (body.next_followup ?? null) !== currentLead.next_followup
    ) {
      events.push({
        lead_id: leadId,
        event_type: "followup_set",
        actor_type: "openclaw",
        payload_json: {
          from: currentLead.next_followup,
          to: body.next_followup ?? null,
        },
      });
    }

    if (hasField(body, "contact") && body.contact?.trim() !== currentLead.contact) {
      events.push({
        lead_id: leadId,
        event_type: "contact_updated",
        actor_type: "openclaw",
        payload_json: {
          from: currentLead.contact,
          to: body.contact?.trim(),
        },
      });
    }

    if (hasField(body, "notes") && (body.notes?.trim() || null) !== currentLead.notes) {
      events.push({
        lead_id: leadId,
        event_type: "note_updated",
        actor_type: "openclaw",
        payload_json: {
          mode: "overwrite",
        },
      });
    }

    if (events.length > 0) {
      const { error: eventError } = await adminClient
        .from("lead_events")
        .insert(events);

      if (eventError) {
        return err(eventError.message, 500);
      }
    }

    return ok({
      ok: true,
      lead_id: leadId,
      updated_fields: Object.keys(updates),
    });
  } catch {
    return err("Invalid JSON body.", 400);
  }
}
