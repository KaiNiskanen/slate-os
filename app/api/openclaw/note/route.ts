/* ──────────────────────────────────────────────
   Slate Novum -- OpenClaw note appending
   Notes are appended with a timestamp so the
   agent cannot silently overwrite history.
   ────────────────────────────────────────────── */

import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";

import { validateOpenClawRequest } from "../../../../lib/openclaw/auth";
import { err, ok } from "../../../../lib/openclaw/respond";
import { getAdminClient } from "../../../../lib/supabase-admin";

interface AppendNoteBody {
  lead_id?: string;
  note?: string;
}

export async function POST(request: NextRequest) {
  const authError = validateOpenClawRequest(request);

  if (authError) {
    return authError;
  }

  try {
    const body = (await request.json()) as AppendNoteBody;
    const leadId = body.lead_id?.trim();
    const note = body.note?.trim();

    if (!leadId || !note) {
      return err("lead_id and note are required.", 400);
    }

    const adminClient = getAdminClient();
    const { data: lead, error: leadError } = await adminClient
      .from("leads")
      .select("id, notes")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return err("Lead not found.", 404);
    }

    // Prefix each entry so appended agent notes stay readable in a single text field.
    const stampedNote = `[${new Date().toISOString()} | openclaw] ${note}`;
    const nextNotes = lead.notes ? `${lead.notes}\n${stampedNote}` : stampedNote;

    const { error: updateError } = await adminClient
      .from("leads")
      .update({ notes: nextNotes })
      .eq("id", leadId);

    if (updateError) {
      return err(updateError.message, 500);
    }

    const { error: eventError } = await adminClient.from("lead_events").insert({
      lead_id: leadId,
      event_type: "note_updated",
      actor_type: "openclaw",
      payload_json: {
        mode: "append",
        note: stampedNote,
      },
    });

    if (eventError) {
      return err(eventError.message, 500);
    }

    // Refresh the leads page so appended OpenClaw notes show up right away.
    revalidatePath("/leads");

    return ok({ ok: true, lead_id: leadId });
  } catch {
    return err("Invalid JSON body.", 400);
  }
}
