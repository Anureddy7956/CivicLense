"use client";

import { useSyncExternalStore } from "react";
import { STORAGE_KEY, UPDATE_EVENT, loadTickets } from "./store";
import type { Ticket } from "./types";

let cacheRaw: string | null | undefined;
let cache: Ticket[] = [];
const SERVER: Ticket[] = [];

function subscribe(cb: () => void) {
  window.addEventListener(UPDATE_EVENT, cb);
  window.addEventListener("storage", cb); // changes from other tabs
  return () => {
    window.removeEventListener(UPDATE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function getSnapshot(): Ticket[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw !== cacheRaw) {
    cache = loadTickets(); // seeds on first visit
    cacheRaw = localStorage.getItem(STORAGE_KEY);
  }
  return cache;
}

/** Live view of tickets in localStorage. Returns null during SSR/hydration. */
export function useTickets(): Ticket[] | null {
  const t = useSyncExternalStore(subscribe, getSnapshot, () => SERVER);
  return t === SERVER ? null : t;
}
