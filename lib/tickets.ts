// Pure ticket helpers shared by the server (store) and the browser (dashboard).
import type { Ticket } from "./types";
import { SEVERITY_RANK } from "./departments";

/** Critical > High > Medium > Low, then newest first. */
export function sortTickets(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort(
    (a, b) =>
      SEVERITY_RANK[b.triage.severity] - SEVERITY_RANK[a.triage.severity] || b.createdAt.localeCompare(a.createdAt),
  );
}

const normArea = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** Possible duplicate = an unresolved ticket with the same category and the same (or overlapping) area. */
export function findDuplicate(tickets: Ticket[], category: string, area: string): Ticket | null {
  const a = normArea(area);
  if (!a) return null;
  const matches = tickets.filter((t) => {
    if (t.status === "Resolved" || t.status === "Rejected" || t.triage.category !== category) return false;
    const b = normArea(t.area);
    return b !== "" && (a === b || a.includes(b) || b.includes(a));
  });
  // Point at the original report, not at another duplicate.
  matches.sort((x, y) => x.createdAt.localeCompare(y.createdAt));
  return matches.find((t) => !t.duplicateOf) ?? matches[0] ?? null;
}

export function nextId(tickets: Ticket[]): string {
  const max = tickets.reduce((m, t) => Math.max(m, Number(t.id.replace(/\D/g, "")) || 0), 1000);
  return `CL-${max + 1}`;
}

/** Accepts only real-world coordinates; anything else becomes null. */
export function parseLatLng(lat: unknown, lng: unknown): { lat: number | null; lng: number | null } {
  const a = typeof lat === "number" ? lat : NaN;
  const b = typeof lng === "number" ? lng : NaN;
  if (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a) > 90 || Math.abs(b) > 180) return { lat: null, lng: null };
  return { lat: Math.round(a * 1e6) / 1e6, lng: Math.round(b * 1e6) / 1e6 };
}
