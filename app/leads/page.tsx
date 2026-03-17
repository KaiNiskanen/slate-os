import { supabase } from "../../lib/supabase";
import type { Lead, TopStats } from "../../lib/types";
import StatsStrip from "./StatsStrip";
import FilterBar from "./FilterBar";
import LeadsTable from "./LeadsTable";
import styles from "./leads.module.css";

export const dynamic = "force-dynamic";

/** Returns the ISO date string for the start of the current week (Monday) */
function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? 6 : day - 1; // distance from Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  return monday.toISOString().slice(0, 10);
}

/** Safe division -- returns 0 when denominator is 0 */
function safeDiv(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams?: { status?: string; q?: string };
}) {
  const filterStatus = searchParams?.status ?? null;
  const searchQuery = searchParams?.q?.trim().toLowerCase() ?? "";
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = getWeekStart();

  /* ── Fetch leads ─────────────────────────────── */
  // Fetch the full list once; the current page still applies status and search filters in memory.
  const { data: allLeadsRaw } = await supabase
    .from("leads")
    .select("*")
    .order("updated_at", { ascending: false });

  const allLeads: Lead[] = (allLeadsRaw ?? []) as Lead[];

  // Filtered leads for the table
  let filteredLeads: Lead[];
  if (filterStatus === "overdue") {
    filteredLeads = allLeads.filter(
      (l) =>
        l.next_followup &&
        l.next_followup < today &&
        l.status !== "closed" &&
        l.status !== "lost"
    );
  } else if (filterStatus) {
    filteredLeads = allLeads.filter((l) => l.status === filterStatus);
  } else {
    filteredLeads = allLeads;
  }

  // Apply simple search over the current filtered list.
  if (searchQuery) {
    filteredLeads = filteredLeads.filter((lead) => {
      const searchableFields = [
        lead.company,
        lead.contact,
        lead.email,
        lead.niche,
        lead.notes,
        lead.website_url,
      ];

      return searchableFields.some((field) =>
        (field ?? "").toLowerCase().includes(searchQuery)
      );
    });
  }

  /* ── Fetch event counts for funnel stats ─────── */
  const { data: eventsRaw } = await supabase
    .from("lead_events")
    .select("event_type, lead_id");

  const events = eventsRaw ?? [];

  // Count distinct leads per event type
  const distinctByType = (type: string): number => {
    const ids = new Set<string>();
    for (const e of events) {
      if (e.event_type === type) ids.add(e.lead_id);
    }
    return ids.size;
  };

  const dmSent = distinctByType("dm_sent");
  const replied = distinctByType("replied");
  const emailSent = distinctByType("email_sent");
  const emailReplied = distinctByType("email_replied");
  const call = distinctByType("call");
  const closed = distinctByType("closed");

  /* ── This-week DMs from events ───────────────── */
  const { data: weekDmsRaw } = await supabase
    .from("lead_events")
    .select("lead_id")
    .eq("event_type", "dm_sent")
    .gte("created_at", `${weekStart}T00:00:00`);

  const weekDmIds = new Set((weekDmsRaw ?? []).map((e: { lead_id: string }) => e.lead_id));
  const thisWeekDms = weekDmIds.size;

  /* ── Compute current-state counts from leads ─── */
  const newCount = allLeads.filter((l) => l.status === "new").length;
  const lostCount = allLeads.filter((l) => l.status === "lost").length;

  const followupsDue = allLeads.filter(
    (l) =>
      l.next_followup &&
      l.next_followup <= today &&
      l.status !== "closed" &&
      l.status !== "lost"
  ).length;

  /* ── Assemble TopStats ───────────────────────── */
  const stats: TopStats = {
    newCount,
    dmSent,
    replied,
    emailSent,
    emailReplied,
    call,
    closed,
    lost: lostCount,
    outreachedTotal: dmSent,
    followupsDue,
    thisWeekDms,
    replyRate: safeDiv(replied, dmSent),
    emailReplyRate: safeDiv(emailReplied, emailSent),
    callRate: safeDiv(call, replied),
    closeRate: safeDiv(closed, call),
  };

  return (
    <main className={styles.page}>
      <StatsStrip stats={stats} />
      <FilterBar current={filterStatus} searchQuery={searchQuery} />
      <LeadsTable leads={filteredLeads} />
    </main>
  );
}
