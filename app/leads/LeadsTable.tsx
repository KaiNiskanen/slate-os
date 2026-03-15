"use client";

import type { Lead } from "../../lib/types";
import LeadRow from "./LeadRow";
import styles from "./leads.module.css";

interface LeadsTableProps {
  leads: Lead[];
}

/** Renders the lead list with a header row and empty state */
export default function LeadsTable({ leads }: LeadsTableProps) {
  if (leads.length === 0) {
    return <div className={styles.empty}>No leads found.</div>;
  }

  return (
    <div className={styles.table}>
      {/* Column headers -- visible on desktop only */}
      <div className={styles.tableHeader}>
        <div>Company</div>
        <div>Status</div>
        <div>Niche</div>
        <div>Follow-up</div>
        <div>Notes</div>
        <div>Links</div>
      </div>

      {leads.map((lead) => (
        <LeadRow key={lead.id} lead={lead} />
      ))}
    </div>
  );
}
