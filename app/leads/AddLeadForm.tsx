"use client";

import { useState, useTransition, useRef } from "react";
import { addLead } from "./actions";
import styles from "./leads.module.css";

/** Collapsible form for adding a new lead */
export default function AddLeadForm({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await addLead(fd);
      if (result?.error) {
        setError(result.error);
      } else {
        formRef.current?.reset();
        onClose();
      }
    });
  };

  return (
    <div className={styles.formCard}>
      <form ref={formRef} onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          <input name="company" placeholder="Company *" required />
          <input name="contact" placeholder="@handle *" required />
          <input name="email" placeholder="Email" />
          <input name="niche" placeholder="Niche" />
          <input name="website_url" placeholder="Website URL" />
          <input name="notes" placeholder="Notes" />
        </div>

        {error && <div className={styles.formError}>{error}</div>}

        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.followupBtn}
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="btn" type="submit" disabled={isPending}>
            {isPending ? "Adding…" : "Add Lead"}
          </button>
        </div>
      </form>
    </div>
  );
}
