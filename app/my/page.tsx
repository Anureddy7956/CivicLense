"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { MY_EVENT, forgetMyTicket, getMyTicketIds, rememberMyTicket, useTickets } from "@/lib/store";
import { CATEGORY_ICON } from "@/lib/departments";
import { STATUS_LABEL, type Ticket } from "@/lib/types";
import RoleGate from "@/components/RoleGate";
import { SeverityBadge, Spinner, StatusBadge } from "@/components/Badges";
import { StatusStepper, TimelineList } from "@/components/Timeline";
import { timeAgo } from "@/components/TicketCard";
import HowTo from "@/components/HowTo";
import { WardAccountability } from "@/components/Accountability";

let idsRaw = "";
let idsCache: string[] = [];
const EMPTY: string[] = [];
function subscribe(cb: () => void) {
  window.addEventListener(MY_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(MY_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
function snapshot() {
  const ids = getMyTicketIds();
  const raw = ids.join(",");
  if (raw !== idsRaw) {
    idsRaw = raw;
    idsCache = ids;
  }
  return idsCache;
}

export default function MyComplaintsPage() {
  return (
    <RoleGate role="citizen">
      <MyComplaints />
    </RoleGate>
  );
}

function MyComplaints() {
  const { tickets, error } = useTickets();
  const ids = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  const [track, setTrack] = useState("");
  const [trackError, setTrackError] = useState<string | null>(null);

  const mine = ids.map((id) => tickets?.find((t) => t.id === id)).filter((t): t is Ticket => Boolean(t));

  function onTrack(e: React.FormEvent) {
    e.preventDefault();
    const id = track.trim().toUpperCase().replace(/^#/, "");
    if (!id) return;
    if (!tickets?.some((t) => t.id === id)) {
      setTrackError(`No ticket found with ID ${id}.`);
      return;
    }
    rememberMyTicket(id);
    setTrack("");
    setTrackError(null);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight text-navy-900 dark:text-white">My complaints</h1>
      <p className="mt-1 mb-4 text-sm text-slate-600 dark:text-slate-400">Complaints sent from this phone, and any ticket you track by ID.</p>
      <HowTo
        id="my"
        steps={[
          <>Complaints you send from this phone appear here automatically.</>,
          <>
            Reported from another phone? Type the <b>ticket ID</b> (e.g. CL-1001) and tap <b>Track</b>.
          </>,
          <>
            The tracker shows each step: <b>Submitted → Field officer assigned → Verified on site → Approved → Work in progress → Resolved</b>. A red ✕ means it was rejected, with the reason.
          </>,
          <>
            Tap <b>Show full timeline</b> to see who acted, when, and their notes.
          </>,
        ]}
      />

      <form onSubmit={onTrack} className="flex gap-2">
        <label htmlFor="track" className="sr-only">
          Ticket ID
        </label>
        <input
          id="track"
          value={track}
          onChange={(e) => setTrack(e.target.value)}
          placeholder="Track a ticket ID, e.g. CL-1001"
          autoCapitalize="characters"
          className="min-h-12 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-base sm:text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        <button className="min-h-12 rounded-lg bg-navy-900 px-4 font-semibold text-white hover:bg-navy-800 dark:bg-navy-500 dark:hover:bg-navy-400">
          Track
        </button>
      </form>
      {trackError && <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">{trackError}</p>}
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/60 dark:text-red-200">⚠️ {error}</p>}

      <div className="mt-5 space-y-4">
        {tickets === null ? (
          <div className="grid place-items-center py-16 text-navy-700 dark:text-navy-300">
            <Spinner className="h-8 w-8" />
          </div>
        ) : mine.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            <p className="text-3xl">🗂️</p>
            <p className="mt-2 font-medium text-slate-700 dark:text-slate-200">No complaints yet</p>
            <p className="mt-1 text-sm">
              <Link href="/" className="font-medium text-navy-600 underline dark:text-navy-300">
                Report an issue
              </Link>{" "}
              or track one by its ticket ID.
            </p>
          </div>
        ) : (
          mine.map((t) => <MyTicket key={t.id} t={t} />)
        )}
      </div>
    </div>
  );
}

function MyTicket({ t }: { t: Ticket }) {
  const [open, setOpen] = useState(false);
  const last = t.timeline[t.timeline.length - 1];
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-semibold text-navy-700 dark:text-navy-300">#{t.id}</span>
          <SeverityBadge severity={t.triage.severity} />
          <StatusBadge status={t.status} />
        </div>
        <h2 className="mt-1.5 font-semibold text-navy-900 dark:text-white">
          {CATEGORY_ICON[t.triage.category]} {t.triage.title}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t.area || "No area"} · {timeAgo(t.createdAt)} · {t.triage.department}
        </p>
        {t.reportsCount > 1 && (
          <p className="mt-1 text-xs font-semibold text-fuchsia-700 dark:text-fuchsia-300">
            👥 Reported by {t.reportsCount} citizens{t.reportsCount >= 3 ? " · 🔥 priority boosted" : ""}
          </p>
        )}

        <div className="mt-4">
          <StatusStepper ticket={t} />
        </div>

        <div className="mt-4">
          <WardAccountability ticket={t} />
        </div>

        {last && (
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
            <b>Latest:</b> {STATUS_LABEL[last.status]}. {last.note}
          </p>
        )}
      </div>
      <div className="flex border-t border-slate-100 text-sm dark:border-slate-800">
        <button onClick={() => setOpen(!open)} className="min-h-12 flex-1 font-medium text-navy-700 hover:bg-slate-50 dark:text-navy-200 dark:hover:bg-slate-800">
          {open ? "Hide" : "Show"} full timeline
        </button>
        <button
          onClick={() => forgetMyTicket(t.id)}
          className="min-h-12 border-l border-slate-100 px-4 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          Remove
        </button>
      </div>
      {open && (
        <div className="border-t border-slate-100 p-4 dark:border-slate-800">
          <TimelineList ticket={t} />
        </div>
      )}
    </article>
  );
}
