"use client";

import { useSyncExternalStore } from "react";

const EVENT = "civiclens:howto";
const key = (id: string) => `civiclens.howto.${id}`;

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

function setHidden(id: string, hidden: boolean) {
  try {
    if (hidden) localStorage.setItem(key(id), "hidden");
    else localStorage.removeItem(key(id));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

/** Short "How to use" guide for a page. Open on first visit; once hidden it stays hidden on this device. */
export default function HowTo({ id, steps, tip }: { id: string; steps: React.ReactNode[]; tip?: React.ReactNode }) {
  const hidden = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key(id)) === "hidden";
      } catch {
        return false;
      }
    },
    () => false,
  );

  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => setHidden(id, false)}
        className="mb-4 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-navy-200 bg-white px-3 text-xs font-medium text-navy-700 hover:bg-navy-50 dark:border-navy-800 dark:bg-slate-900 dark:text-navy-200 dark:hover:bg-slate-800"
      >
        💡 How to use
      </button>
    );
  }

  return (
    <section className="mb-5 rounded-xl border border-navy-200 bg-navy-50/70 p-4 dark:border-navy-800 dark:bg-navy-950/50" aria-label="How to use this page">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-navy-900 dark:text-navy-100">💡 How to use</h2>
        <button
          type="button"
          onClick={() => setHidden(id, true)}
          className="min-h-9 rounded-md px-2 text-xs font-medium text-navy-700 hover:bg-navy-100 dark:text-navy-200 dark:hover:bg-navy-900"
        >
          Hide
        </button>
      </div>
      <ol className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-300">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-navy-600 text-[11px] font-bold text-white dark:bg-navy-500">
              {i + 1}
            </span>
            <span className="min-w-0">{s}</span>
          </li>
        ))}
      </ol>
      {tip && <p className="mt-3 border-t border-navy-200 pt-2 text-xs text-slate-600 dark:border-navy-800 dark:text-slate-400">{tip}</p>}
    </section>
  );
}
