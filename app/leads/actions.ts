"use server";

/* ──────────────────────────────────────────────
   Slate Novum -- Server Actions
   All lead mutations + event logging.
   Every status change logs to lead_events.
   ────────────────────────────────────────────── */

import { revalidatePath } from "next/cache";
import { supabase } from "../../lib/supabase";
import type { StatusValue, EventType } from "../../lib/types";
import { STATUS_OPTIONS } from "../../lib/constants";

/** Normalize an IG handle to the dedup key: lowercase, strip @, trim */
function normalizeContact(raw: string): string {
  return raw.toLowerCase().replace(/^@/, "").trim();
}

/** Insert a row into lead_events */
async function logEvent(
  leadId: string,
  eventType: EventType,
  payload: Record<string, unknown> = {}
) {
  await supabase.from("lead_events").insert({
    lead_id: leadId,
    event_type: eventType,
    payload_json: payload,
  });
}

/* ── Add lead ──────────────────────────────────── */

export async function addLead(formData: FormData) {
  const company = (formData.get("company") as string)?.trim();
  const contact = (formData.get("contact") as string)?.trim();

  if (!company || !contact) {
    return { error: "Company and contact are required." };
  }

  const contactNorm = normalizeContact(contact);

  // Check for duplicate
  const { data: existing } = await supabase
    .from("leads")
    .select("id")
    .eq("contact_norm", contactNorm)
    .limit(1);

  if (existing && existing.length > 0) {
    return { error: "This contact already exists." };
  }

  const { data: inserted, error } = await supabase
    .from("leads")
    .insert({
      company,
      contact,
      contact_norm: contactNorm,
      status: "new" as StatusValue,
      email: (formData.get("email") as string)?.trim() || null,
      niche: (formData.get("niche") as string)?.trim() || null,
      website_url: (formData.get("website_url") as string)?.trim() || null,
      notes: (formData.get("notes") as string)?.trim() || null,
      source: "manual",
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { error: error?.message ?? "Failed to add lead." };
  }

  await logEvent(inserted.id, "created");
  revalidatePath("/leads");
  return { error: null };
}

/* ── Update status ─────────────────────────────── */

export async function updateStatus(leadId: string, newStatus: string) {
  if (!STATUS_OPTIONS.includes(newStatus as StatusValue)) {
    return { error: "Invalid status." };
  }

  const { error } = await supabase
    .from("leads")
    .update({ status: newStatus })
    .eq("id", leadId);

  if (error) return { error: error.message };

  // Log the status change as an event
  await logEvent(leadId, newStatus as EventType, {});
  revalidatePath("/leads");
  return { error: null };
}

/* ── Update follow-up date ─────────────────────── */

export async function updateFollowUp(leadId: string, date: string | null) {
  const { error } = await supabase
    .from("leads")
    .update({ next_followup: date })
    .eq("id", leadId);

  if (error) return { error: error.message };

  await logEvent(leadId, "followup_set", { date });
  revalidatePath("/leads");
  return { error: null };
}

/* ── Update notes ──────────────────────────────── */

export async function updateNotes(leadId: string, notes: string) {
  const { error } = await supabase
    .from("leads")
    .update({ notes })
    .eq("id", leadId);

  if (error) return { error: error.message };
  revalidatePath("/leads");
  return { error: null };
}

/* ── Delete lead ───────────────────────────────── */

export async function deleteLead(leadId: string) {
  // lead_events are cascade-deleted by the FK constraint
  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", leadId);

  if (error) return { error: error.message };
  revalidatePath("/leads");
  return { error: null };
}
