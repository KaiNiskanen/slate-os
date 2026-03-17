"use client";

import type { TopStats } from "../../lib/types";
import { WEEKLY_OUTREACH_GOAL } from "../../lib/constants";
import styles from "./leads.module.css";

/** Horizontal scrollable strip showing the top-level operational stats */
export default function StatsStrip({ stats }: { stats: TopStats }) {
  const chips: { label: string; value: string }[] = [
    { label: "New", value: String(stats.newCount) },
    { label: "DM Sent", value: String(stats.dmSent) },
    { label: "Replied", value: String(stats.replied) },
    { label: "Email Sent", value: String(stats.emailSent) },
    { label: "Email Replied", value: String(stats.emailReplied) },
    { label: "Call", value: String(stats.call) },
    { label: "Closed", value: String(stats.closed) },
    { label: "Lost", value: String(stats.lost) },
    { label: "Outreached", value: String(stats.outreachedTotal) },
    { label: "Follow-ups Due", value: String(stats.followupsDue) },
    {
      label: "This Week DMs",
      value: `${stats.thisWeekDms} / ${WEEKLY_OUTREACH_GOAL}`,
    },
    { label: "Reply Rate", value: `${(stats.replyRate * 100).toFixed(1)}%` },
    {
      label: "Email Reply Rate",
      value: `${(stats.emailReplyRate * 100).toFixed(1)}%`,
    },
    { label: "Call Rate", value: `${(stats.callRate * 100).toFixed(1)}%` },
    { label: "Close Rate", value: `${(stats.closeRate * 100).toFixed(1)}%` },
  ];

  return (
    <div className={styles.statsStrip}>
      {chips.map((chip) => (
        <div key={chip.label} className={styles.statsChip}>
          <span className={styles.statsValue}>{chip.value}</span>
          <span className={styles.statsLabel}>{chip.label}</span>
        </div>
      ))}
    </div>
  );
}
