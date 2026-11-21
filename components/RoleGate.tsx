"use client";

import { setRole, useRole } from "@/lib/role";
import { PERSONAS } from "@/lib/workflow";
import type { Role } from "@/lib/types";
import { Spinner } from "./Badges";

/** Shows children only for the given role; otherwise offers a one-tap switch (demo, no real login). */
export default function RoleGate({ role, children }: { role: Role | Role[]; children: React.ReactNode }) {
  const current = useRole();
  const allowed = Array.isArray(role) ? role : [role];
  if (current === null) {
    return (
      <div className="grid place-items-center py-24 text-navy-700 dark:text-navy-300">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  if (allowed.includes(current)) return <>{children}</>;
  const target = allowed[0];
  const p = PERSONAS[target];
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-4xl" aria-hidden>
        {p.icon}
      </p>
      <h1 className="mt-2 text-xl font-bold text-navy-900 dark:text-white">
        This page is for the {allowed.map((r) => PERSONAS[r].label).join(" or ")}
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        You’re viewing as {PERSONAS[current].label}. Switch roles to continue. (Demo: no login needed.)
      </p>
      <button
        onClick={() => setRole(target)}
        className="mt-4 min-h-12 w-full rounded-lg bg-navy-900 px-4 font-semibold text-white hover:bg-navy-800 dark:bg-navy-500 dark:hover:bg-navy-400"
      >
        Switch to {p.label}
      </button>
    </div>
  );
}
