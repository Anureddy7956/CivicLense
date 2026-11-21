"use client";

import type { Status, Ticket, TriageResult } from "./types";
import { SEVERITY_RANK } from "./departments";
import { seedTickets } from "./seed";

export const STORAGE_KEY = "civiclens.tickets.v2";
export const UPDATE_EVENT = "civiclens:update";

/** Reads tickets; on the very first visit, preloads the sample tickets. */
export function loadTickets(): Ticket[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    const seeded = seedTickets();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    return JSON.parse(raw) as Ticket[];
  } catch {
    return [];
  }
}

function save(tickets: Ticket[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  } catch {
    // localStorage is ~5MB. If full, drop photos from all but the 10 newest tickets and retry.
    const newestFirst = [...tickets].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const keep = new Set(newestFirst.slice(0, 10).map((t) => t.id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets.map((t) => (keep.has(t.id) ? t : { ...t, photo: null }))));
  }
  window.dispatchEvent(new Event(UPDATE_EVENT));
}

function nextId(tickets: Ticket[]): string {
  const max = tickets.reduce((m, t) => Math.max(m, Number(t.id.replace(/\D/g, "")) || 0), 1000);
  return `CL-${max + 1}`;
}

const normArea = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** Possible duplicate = an open (not resolved) ticket with the same category and same area. */
export function findDuplicate(tickets: Ticket[], category: string, area: string): Ticket | null {
  const a = normArea(area);
  if (!a) return null;
  const matches = tickets.filter((t) => {
    if (t.status === "Resolved" || t.triage.category !== category) return false;
    const b = normArea(t.area);
    return b !== "" && (a === b || a.includes(b) || b.includes(a));
  });
  // Point at the original report, not at another duplicate.
  matches.sort((x, y) => x.createdAt.localeCompare(y.createdAt));
  return matches.find((t) => !t.duplicateOf) ?? matches[0] ?? null;
}

export function createTicket(input: { text: string; photo: string | null; area: string; triage: TriageResult }): Ticket {
  const tickets = loadTickets();
  const dup = findDuplicate(tickets, input.triage.category, input.area);
  const ticket: Ticket = {
    id: nextId(tickets),
    createdAt: new Date().toISOString(),
    text: input.text,
    photo: input.photo,
    area: input.area,
    triage: input.triage,
    status: "Open",
    duplicateOf: dup?.id ?? null,
  };
  save([ticket, ...tickets]);
  return ticket;
}

export function setStatus(id: string, status: Status) {
  save(loadTickets().map((t) => (t.id === id ? { ...t, status } : t)));
}

export function resetDemoData() {
  save(seedTickets());
}

/** Critical > High > Medium > Low, then newest first. */
export function sortTickets(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort(
    (a, b) =>
      SEVERITY_RANK[b.triage.severity] - SEVERITY_RANK[a.triage.severity] || b.createdAt.localeCompare(a.createdAt),
  );
}

/** Resize + re-encode as JPEG until the payload is under maxBytes (default ~1MB). */
export async function compressImage(file: File, maxBytes = 900_000): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Could not read that image. Please try a JPG or PNG."));
      i.src = url;
    });
    let side = 1600;
    let quality = 0.82;
    for (let attempt = 0; attempt < 8; attempt++) {
      const scale = Math.min(1, side / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fff"; // transparent PNGs → white, not black
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      const bytes = Math.ceil(((dataUrl.length - dataUrl.indexOf(",") - 1) * 3) / 4);
      if (bytes <= maxBytes) return dataUrl;
      if (quality > 0.5) quality -= 0.12;
      else side = Math.round(side * 0.75);
    }
    throw new Error("That photo is too large even after compression. Please try another one.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
