"use client";

import { useTransition } from "react";
import { updateFollowUp } from "./actions";
import styles from "./leads.module.css";

interface FollowUpActionsProps {
  leadId: string;
  currentDate: string | null;
}

/** Adds N days to today and returns YYYY-MM-DD */
function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Quick follow-up buttons (+2d, +5d, +7d) plus a date picker and clear */
export default function FollowUpActions({
  leadId,
  currentDate,
}: FollowUpActionsProps) {
  const [isPending, startTransition] = useTransition();

  const handleQuick = (days: number) => {
    startTransition(async () => {
      await updateFollowUp(leadId, addDays(days));
    });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value || null;
    startTransition(async () => {
      await updateFollowUp(leadId, val);
    });
  };

  const handleClear = () => {
    startTransition(async () => {
      await updateFollowUp(leadId, null);
    });
  };

  return (
    <div
      className={styles.followupActions}
      style={{ opacity: isPending ? 0.5 : 1 }}
    >
      <button
        type="button"
        className={styles.followupBtn}
        onClick={() => handleQuick(2)}
      >
        +2d
      </button>
      <button
        type="button"
        className={styles.followupBtn}
        onClick={() => handleQuick(5)}
      >
        +5d
      </button>
      <button
        type="button"
        className={styles.followupBtn}
        onClick={() => handleQuick(7)}
      >
        +7d
      </button>
      <input
        type="date"
        value={currentDate ?? ""}
        onChange={handleDateChange}
        style={{ fontSize: 11, padding: "2px 4px", maxWidth: 120 }}
      />
      {currentDate && (
        <button
          type="button"
          className={styles.followupBtn}
          onClick={handleClear}
        >
          ✕
        </button>
      )}
    </div>
  );
}
