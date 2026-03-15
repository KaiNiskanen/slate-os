"use client";

import { useState, useRef, useTransition, useCallback } from "react";
import type { Lead, StatusValue } from "../../lib/types";
import { STATUS_OPTIONS, STATUS_LABELS } from "../../lib/constants";
import { updateStatus, updateNotes, deleteLead } from "./actions";
import FollowUpActions from "./FollowUpActions";
import styles from "./leads.module.css";

/** Builds an Instagram profile URL from a handle like "@crapeyewear" */
function buildIgUrl(handle: string): string {
  const cleaned = (handle || "").replace(/^@/, "").trim();
  return cleaned ? `https://instagram.com/${cleaned}` : "";
}

/** Returns true if the follow-up date is in the past */
function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const today = new Date().toISOString().slice(0, 10);
  return dateStr < today;
}

interface LeadRowProps {
  lead: Lead;
}

/** Interactive lead row with inline status, follow-up, notes, and delete */
export default function LeadRow({ lead }: LeadRowProps) {
  const igUrl = buildIgUrl(lead.contact);
  const overdue = isOverdue(lead.next_followup);
  const [isPending, startTransition] = useTransition();

  /* ── Status dropdown ─────────────────────────── */
  const [status, setStatus] = useState<StatusValue>(lead.status);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVal = e.target.value as StatusValue;
    setStatus(newVal); // optimistic
    startTransition(async () => {
      const result = await updateStatus(lead.id, newVal);
      if (result?.error) setStatus(lead.status); // revert on error
    });
  };

  /* ── Inline notes editing (save on blur, debounced) */
  const [notes, setNotes] = useState(lead.notes ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveNotes = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        startTransition(async () => {
          await updateNotes(lead.id, value);
        });
      }, 500);
    },
    [lead.id, startTransition]
  );

  const handleNotesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNotes(e.target.value);
    saveNotes(e.target.value);
  };

  /* ── Delete ──────────────────────────────────── */
  const handleDelete = () => {
    if (!window.confirm(`Delete ${lead.company}?`)) return;
    startTransition(async () => {
      await deleteLead(lead.id);
    });
  };

  return (
    <div
      className={`${styles.row} ${overdue ? styles.rowOverdue : ""}`}
      style={{ opacity: isPending ? 0.6 : 1 }}
    >
      {/* Company + contact */}
      <div>
        <div className={styles.rowCompany}>{lead.company}</div>
        <div className={styles.rowContact}>{lead.contact}</div>
      </div>

      {/* Status dropdown */}
      <div>
        <select
          value={status}
          onChange={handleStatusChange}
          style={{ fontSize: 12, padding: "4px 6px" }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Niche */}
      <div className={styles.rowNiche}>{lead.niche || "—"}</div>

      {/* Follow-up date + quick actions */}
      <div>
        <FollowUpActions leadId={lead.id} currentDate={lead.next_followup} />
      </div>

      {/* Inline notes */}
      <div>
        <input
          className={styles.notesInput}
          value={notes}
          onChange={handleNotesChange}
          placeholder="Notes…"
        />
      </div>

      {/* Actions: IG / Web / Delete */}
      <div className={styles.actions}>
        {igUrl && (
          <a
            className={styles.linkBtn}
            href={igUrl}
            target="_blank"
            rel="noreferrer"
          >
            IG
          </a>
        )}
        {lead.website_url && (
          <a
            className={styles.linkBtn}
            href={lead.website_url}
            target="_blank"
            rel="noreferrer"
          >
            Web
          </a>
        )}
        <button
          type="button"
          className={styles.dangerBtn}
          onClick={handleDelete}
        >
          Del
        </button>
      </div>
    </div>
  );
}
