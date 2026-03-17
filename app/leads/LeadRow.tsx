"use client";

import { useState, useRef, useTransition, useCallback, useEffect } from "react";
import type { Lead, StatusValue } from "../../lib/types";
import { STATUS_OPTIONS, STATUS_LABELS } from "../../lib/constants";
import {
  updateStatus,
  updateNotes,
  updateContact,
  deleteLead,
  logEmailSent,
  logEmailReply,
} from "./actions";
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

  /* ── Inline Instagram handle editing ─────────── */
  const [contact, setContact] = useState(lead.contact);
  const [contactError, setContactError] = useState<string | null>(null);
  const [savedContact, setSavedContact] = useState(lead.contact);
  const igUrl = buildIgUrl(contact);
  const [emailEventError, setEmailEventError] = useState<string | null>(null);

  // Keep local state aligned if the row re-renders with fresh data from the server.
  useEffect(() => {
    setContact(lead.contact);
    setSavedContact(lead.contact);
    setContactError(null);
  }, [lead.contact]);

  const saveContact = useCallback(() => {
    const nextContact = contact.trim();

    // Don't send a mutation when nothing changed.
    if (nextContact === savedContact) {
      setContactError(null);
      return;
    }

    // Reject blank values locally and restore the last saved handle.
    if (!nextContact) {
      setContact(savedContact);
      setContactError("Instagram handle cannot be empty.");
      return;
    }

    startTransition(async () => {
      const result = await updateContact(lead.id, nextContact);

      if (result?.error) {
        setContact(savedContact);
        setContactError(result.error);
        return;
      }

      if (result?.contact) {
        setSavedContact(result.contact);
        setContact(result.contact);
      }

      setContactError(null);
    });
  }, [contact, lead.id, savedContact, startTransition]);

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContact(e.target.value);
    if (contactError) {
      setContactError(null);
    }
  };

  const handleContactKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveContact();
      e.currentTarget.blur();
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setContact(savedContact);
      setContactError(null);
      e.currentTarget.blur();
    }
  };

  /* ── Delete ──────────────────────────────────── */
  const handleDelete = () => {
    if (!window.confirm(`Delete ${lead.company}?`)) return;
    startTransition(async () => {
      await deleteLead(lead.id);
    });
  };

  const handleEmailEvent = useCallback(
    (eventType: "sent" | "replied") => {
      startTransition(async () => {
        const result =
          eventType === "sent"
            ? await logEmailSent(lead.id)
            : await logEmailReply(lead.id);

        setEmailEventError(result?.error ?? null);
      });
    },
    [lead.id, startTransition]
  );

  return (
    <div
      className={`${styles.row} ${overdue ? styles.rowOverdue : ""}`}
      style={{ opacity: isPending ? 0.6 : 1 }}
    >
      {/* Company + contact */}
      <div>
        <div className={styles.rowCompany}>{lead.company}</div>
        <input
          className={styles.contactInput}
          value={contact}
          onChange={handleContactChange}
          onBlur={saveContact}
          onKeyDown={handleContactKeyDown}
          placeholder="@handle"
          aria-label={`Instagram handle for ${lead.company}`}
        />
        {contactError ? (
          <div className={styles.inlineError}>{contactError}</div>
        ) : null}
      </div>

      {/* Email + lightweight email event logging */}
      <div>
        {lead.email ? (
          <>
            <a className={styles.emailLink} href={`mailto:${lead.email}`}>
              {lead.email}
            </a>
            <div className={styles.emailActions}>
              {/* These buttons keep email tracking lightweight and manual for now. */}
              <button
                type="button"
                className={styles.emailEventBtn}
                onClick={() => handleEmailEvent("sent")}
              >
                Email Sent
              </button>
              <button
                type="button"
                className={styles.emailEventBtn}
                onClick={() => handleEmailEvent("replied")}
              >
                Email Reply
              </button>
            </div>
          </>
        ) : (
          <span className={styles.emailEmpty}>—</span>
        )}
        {emailEventError ? (
          <div className={styles.inlineError}>{emailEventError}</div>
        ) : null}
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
