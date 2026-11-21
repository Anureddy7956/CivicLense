// Pure ticket helpers shared by the server (store) and the browser (dashboard).
import type { Ticket } from "./types";
import { SEVERITY_RANK } from "./departments";
import { distanceMeters } from "./workflow";

export const BOOST_AT = 3; // citizens reporting the same issue before its priority is raised
export const DUPLICATE_WINDOW_DAYS = 7;
const DUPLICATE_MAX_METERS = 500; // two GPS-tagged reports further apart than this are different spots

export const isBoosted = (t: Pick<Ticket, "reportsCount">) => (t.reportsCount ?? 1) >= BOOST_AT;

/** Priority rank: severity, plus one level when ≥3 citizens reported the same issue. */
export const priorityRank = (t: Ticket) => SEVERITY_RANK[t.triage.severity] + (isBoosted(t) ? 1 : 0);

/** Highest priority first (boosted tickets jump a level; a genuine higher severity wins ties), then newest first. */
export function sortTickets(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort(
    (a, b) =>
      priorityRank(b) - priorityRank(a) ||
      SEVERITY_RANK[b.triage.severity] - SEVERITY_RANK[a.triage.severity] ||
      b.createdAt.localeCompare(a.createdAt),
  );
}

const normArea = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/**
 * Finds the open ticket a new report duplicates: same category, reported within 7 days, and the same ward
 * (or overlapping area text when a ward isn't known). Reports with GPS more than 500 m apart never match.
 */
export function findDuplicate(
  tickets: Ticket[],
  r: { category: string; wardNo: number | null; area: string; lat: number | null; lng: number | null; now?: number },
): Ticket | null {
  const now = r.now ?? Date.now();
  const a = normArea(r.area);
  const matches = tickets.filter((t) => {
    if (t.status === "Resolved" || t.status === "Rejected" || t.triage.category !== r.category) return false;
    if (now - new Date(t.createdAt).getTime() > DUPLICATE_WINDOW_DAYS * 864e5) return false;
    if (r.lat != null && r.lng != null && t.lat != null && t.lng != null) {
      if (distanceMeters({ lat: r.lat, lng: r.lng }, { lat: t.lat, lng: t.lng }) > DUPLICATE_MAX_METERS) return false;
    }
    if (r.wardNo != null && t.wardNo != null) return r.wardNo === t.wardNo;
    const b = normArea(t.area);
    return a !== "" && b !== "" && (a === b || a.includes(b) || b.includes(a));
  });
  // Point at the original report, not at an older linked duplicate.
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
