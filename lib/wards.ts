// Ward registry lookup (DEMO DATA, see wards.json). Shared by server and browser.
import registry from "./wards.json";
import { DEPARTMENTS } from "./departments";
import { distanceMeters } from "./workflow";
import type { Ticket } from "./types";

export interface Officer {
  name: string;
  designation: string;
  phone: string;
}

export interface Ward {
  number: number;
  name: string;
  aliases: string[];
  lat: number;
  lng: number;
  officers: Record<"BBMP" | "BWSSB" | "BESCOM", Officer>;
  contractor: { name: string; tender: string; maintenanceFrom: string; maintenanceTo: string };
}

export const WARDS: Ward[] = registry.wards as Ward[];

const norm = (s: string) => ` ${s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;

/** Match by area text (aliases), else by GPS to the nearest ward centre within 2.5 km. */
export function matchWard(area: string, lat: number | null, lng: number | null): Ward | null {
  const a = norm(area);
  if (a.trim()) {
    // Longest alias first, so "jayanagar 4th block" beats "jayanagar".
    let best: { ward: Ward; len: number } | null = null;
    for (const w of WARDS) {
      for (const alias of w.aliases) {
        if (a.includes(norm(alias)) && (!best || alias.length > best.len)) best = { ward: w, len: alias.length };
      }
    }
    if (best) return best.ward;
  }
  if (lat != null && lng != null) {
    let near: { ward: Ward; d: number } | null = null;
    for (const w of WARDS) {
      const d = distanceMeters({ lat, lng }, { lat: w.lat, lng: w.lng });
      if (!near || d < near.d) near = { ward: w, d };
    }
    if (near && near.d <= 2500) return near.ward;
  }
  return null;
}

export const wardByNumber = (n: number | null | undefined) => (n == null ? null : (WARDS.find((w) => w.number === n) ?? null));

/** Accountability details for a ticket: ward, responsible officer, and (roads only) contractor + maintenance check. */
export function accountabilityFor(t: Pick<Ticket, "wardNo" | "createdAt" | "triage">) {
  const ward = wardByNumber(t.wardNo);
  if (!ward) return null;
  const agency = DEPARTMENTS[t.triage.category].agency;
  const officer = ward.officers[agency];
  const roads = t.triage.category === "roads";
  const day = t.createdAt.slice(0, 10);
  const c = ward.contractor;
  return {
    ward,
    agency,
    officer,
    contractor: roads ? { ...c, withinMaintenance: day >= c.maintenanceFrom && day <= c.maintenanceTo } : null,
  };
}
