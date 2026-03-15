/* ──────────────────────────────────────────────
   Slate Novum -- shared constants
   Single source of truth for status values,
   labels, and operational targets
   ────────────────────────────────────────────── */

import type { StatusValue } from "./types";

/** Ordered pipeline stages used for filters, dropdowns, and validation */
export const STATUS_OPTIONS: StatusValue[] = [
  "new",
  "dm_sent",
  "replied",
  "call",
  "closed",
  "lost",
];

/** Human-readable labels for each status */
export const STATUS_LABELS: Record<StatusValue, string> = {
  new: "New",
  dm_sent: "DM Sent",
  replied: "Replied",
  call: "Call",
  closed: "Closed",
  lost: "Lost",
};

/** Weekly outreach DM target -- displayed in stats strip */
export const WEEKLY_OUTREACH_GOAL = 350;
