"use client";

import { useCallback, useEffect, useState } from "react";
import type { Role, Ticket, TriageResult, VerifyOutcome } from "./types";
import type { Action } from "./workflow";

export type SubmitResult =
  | { ok: true; ticket: Ticket }
  | { ok: false; error: string; triage?: TriageResult };

async function readJson(res: Response): Promise<Record<string, unknown>> {
  return res.json().catch(() => ({}));
}

const networkError = "Can't reach the CivicLens server. Check that you're on the same Wi-Fi and try again.";

/** Sends a complaint to the server, which triages it with AI and saves it. */
export async function submitComplaint(input: {
  text: string;
  area: string;
  photo: string | null;
  lat: number | null;
  lng: number | null;
}): Promise<SubmitResult> {
  let res: Response;
  try {
    res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    return { ok: false, error: networkError };
  }
  const data = await readJson(res);
  if (res.ok && data.ticket) {
    rememberMyTicket((data.ticket as Ticket).id);
    return { ok: true, ticket: data.ticket as Ticket };
  }
  return {
    ok: false,
    error: (data.error as string) || "Something went wrong. Please try again.",
    triage: data.triage as TriageResult | undefined,
  };
}

/**
 * Live list of tickets from the shared server store. Polls every few seconds while the tab is
 * visible, so complaints sent from a phone appear on the officer's screen on their own.
 */
export function useTickets(pollMs = 4000) {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/tickets", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await readJson(res);
      setTickets(data.tickets as Ticket[]);
      setError(null);
    } catch {
      setError(networkError);
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      clearInterval(timer);
      void refresh();
      timer = setInterval(() => void refresh(), pollMs);
    };
    const onVisibility = () => (document.hidden ? clearInterval(timer) : start());
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh, pollMs]);

  return { tickets, error, refresh };
}

export interface ActionInput {
  action: Action;
  role: Role;
  note?: string;
  outcome?: VerifyOutcome;
  photo?: string | null;
  lat?: number | null;
  lng?: number | null;
  accuracyM?: number | null;
}

/** Runs a workflow action on the server. Returns the updated ticket or a friendly error. */
export async function runAction(id: string, input: ActionInput): Promise<{ ok: true; ticket: Ticket } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/tickets/${encodeURIComponent(id)}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await readJson(res);
    if (res.ok && data.ticket) return { ok: true, ticket: data.ticket as Ticket };
    return { ok: false, error: (data.error as string) || "Something went wrong. Please try again." };
  } catch {
    return { ok: false, error: networkError };
  }
}

// ---------- "My complaints": ticket IDs this device submitted or chose to track ----------

const MY_KEY = "civiclens.myTickets";
export const MY_EVENT = "civiclens:my";

export function getMyTicketIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(MY_KEY) || "[]");
  } catch {
    return [];
  }
}

export function rememberMyTicket(id: string) {
  const ids = getMyTicketIds().filter((x) => x !== id);
  localStorage.setItem(MY_KEY, JSON.stringify([id, ...ids]));
  window.dispatchEvent(new Event(MY_EVENT));
}

export function forgetMyTicket(id: string) {
  localStorage.setItem(MY_KEY, JSON.stringify(getMyTicketIds().filter((x) => x !== id)));
  window.dispatchEvent(new Event(MY_EVENT));
}

// ---------- GPS ----------

export interface Fix {
  lat: number;
  lng: number;
  accuracyM: number;
}

/** Current position. Needs HTTPS (or localhost) and the user's permission. */
export function getLocation(timeoutMs = 15000): Promise<Fix> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("This device can't share its location."));
    if (!window.isSecureContext) return reject(new Error("Location needs the secure https:// link."));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracyM: Math.round(p.coords.accuracy) }),
      (e) =>
        reject(
          new Error(
            e.code === e.PERMISSION_DENIED
              ? "Location permission was denied. Allow it in your browser settings."
              : "Couldn't get your location. Move to an open area and try again.",
          ),
        ),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30000 },
    );
  });
}

/** Resize + re-encode as JPEG until the payload is under maxBytes (default ~0.9 MB). */
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
