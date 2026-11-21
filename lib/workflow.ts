// Ticket workflow rules, shared by the server (enforcement) and the UI (which buttons to show).
import type { Role, Status, Ticket } from "./types";

export const PERSONAS: Record<Role, { label: string; name: string; icon: string; home: string }> = {
  citizen: { label: "Citizen", name: "Citizen", icon: "🙋", home: "/" },
  field_officer: { label: "Field Officer", name: "Field Officer", icon: "🦺", home: "/field" },
  authority: { label: "Higher Authority", name: "Higher Authority", icon: "🏛️", home: "/authority" },
};

export type Action = "assign" | "capture_evidence" | "verify" | "approve" | "send_back" | "reject" | "start_work" | "resolve";

export const ACTION_RULES: Record<Action, { role: Role; from: Status[] }> = {
  assign: { role: "authority", from: ["Submitted"] },
  capture_evidence: { role: "field_officer", from: ["Assigned"] },
  verify: { role: "field_officer", from: ["Assigned"] },
  approve: { role: "authority", from: ["Field Verified"] },
  send_back: { role: "authority", from: ["Field Verified"] },
  reject: { role: "authority", from: ["Field Verified"] },
  start_work: { role: "field_officer", from: ["Approved"] },
  resolve: { role: "field_officer", from: ["In Progress"] },
};

export function canDo(action: Action, role: Role, ticket: Pick<Ticket, "status">): boolean {
  const rule = ACTION_RULES[action];
  return rule.role === role && rule.from.includes(ticket.status);
}

/** The happy-path steps shown in the citizen's stepper. */
export const STEPS: Status[] = ["Submitted", "Assigned", "Field Verified", "Approved", "In Progress", "Resolved"];

export const OPEN_STATUSES: Status[] = ["Submitted", "Assigned", "Field Verified", "Approved", "In Progress"];
export const isOpen = (s: Status) => OPEN_STATUSES.includes(s);

export const GPS_WARN_METERS = 200;

/** Great-circle distance in metres. */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export function mapsUrl(t: Pick<Ticket, "lat" | "lng" | "area">): string {
  const q = t.lat != null && t.lng != null ? `${t.lat},${t.lng}` : `${t.area || "Bengaluru"}, Bengaluru`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function formatDistance(m: number): string {
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}
