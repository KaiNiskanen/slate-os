/* ──────────────────────────────────────────────
   Slate Novum -- shared lead normalization
   Keeps identity rules consistent between
   UI actions, API routes, and database writes.
   ────────────────────────────────────────────── */

/** Normalize an IG handle to the dedupe key. */
export function normalizeContact(raw: string) {
  return raw.toLowerCase().replace(/^@/, "").trim();
}

/** Normalize an email for exact matching and indexing. */
export function normalizeEmail(raw: string) {
  return raw.toLowerCase().trim();
}

/** Extract a stable domain from a URL-like string for dedupe/search. */
export function extractDomain(raw: string) {
  const trimmed = raw.trim();

  if (!trimmed) {
    return "";
  }

  try {
    const url = trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;

    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return trimmed.replace(/^https?:\/\//, "").replace(/^www\./, "").toLowerCase();
  }
}
