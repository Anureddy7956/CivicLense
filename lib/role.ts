"use client";

import { useSyncExternalStore } from "react";
import { ROLES, type Role } from "./types";

const KEY = "civiclens.role";
const EVENT = "civiclens:role";

// Demo deep links: /field?role=field_officer opens straight into that role.
if (typeof window !== "undefined") {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("role") as Role | null;
    if (fromUrl && ROLES.includes(fromUrl)) localStorage.setItem(KEY, fromUrl);
  } catch {}
}

function read(): Role {
  try {
    const r = localStorage.getItem(KEY) as Role | null;
    return r && ROLES.includes(r) ? r : "citizen";
  } catch {
    return "citizen";
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Current demo role, saved in localStorage. `null` until hydrated on the client. */
export function useRole(): Role | null {
  return useSyncExternalStore<Role | null>(subscribe, read, () => null);
}

export function setRole(role: Role) {
  localStorage.setItem(KEY, role);
  window.dispatchEvent(new Event(EVENT));
}
