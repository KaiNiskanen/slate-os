/* ──────────────────────────────────────────────
   Slate Novum -- shared TypeScript types
   Mirrors the Supabase leads + lead_events schema
   ────────────────────────────────────────────── */

export type StatusValue =
  | "new"
  | "dm_sent"
  | "replied"
  | "call"
  | "closed"
  | "lost";

export type EventType =
  | "created"
  | "dm_sent"
  | "replied"
  | "email_sent"
  | "email_replied"
  | "call"
  | "closed"
  | "lost"
  | "contact_updated"
  | "note_updated"
  | "followup_set";

export type SourceValue = "manual" | "openclaw" | "csv_import";

/** Row from the `leads` table */
export interface Lead {
  id: string;
  company: string;
  contact: string;
  contact_norm: string;
  status: StatusValue;
  email: string | null;
  email_norm?: string | null;
  niche: string | null;
  website_url: string | null;
  website_domain_norm?: string | null;
  notes: string | null;
  next_followup: string | null; // date string YYYY-MM-DD
  source: SourceValue;
  created_at: string; // timestamptz ISO string
  updated_at: string; // timestamptz ISO string
}

/** Row from the `lead_events` table */
export interface LeadEvent {
  id: string;
  lead_id: string;
  event_type: EventType;
  actor_type?: "user" | "openclaw" | "system";
  created_at: string;
  payload_json: Record<string, unknown>;
}

/** Computed stats passed to the StatsStrip component */
export interface TopStats {
  newCount: number;
  dmSent: number;
  replied: number;
  emailSent: number;
  emailReplied: number;
  call: number;
  closed: number;
  lost: number;
  outreachedTotal: number;
  followupsDue: number;
  thisWeekDms: number;
  replyRate: number;
  emailReplyRate: number;
  callRate: number;
  closeRate: number;
}
