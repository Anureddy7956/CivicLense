"use client";

import { useState } from "react";
import { GPS_WARN_METERS, formatDistance, mapsUrl } from "@/lib/workflow";
import type { MatchCheck, Ticket } from "@/lib/types";

/** Tap-to-zoom photo with a caption; shows a placeholder when there's no photo. */
export function Photo({ src, label, empty = "No photo" }: { src: string | null | undefined; label: string; empty?: string }) {
  const [zoom, setZoom] = useState(false);
  return (
    <figure className="min-w-0">
      {src ? (
        <button type="button" onClick={() => setZoom(true)} className="block w-full cursor-zoom-in" aria-label={`Enlarge ${label}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={label} loading="lazy" className="aspect-[4/3] w-full rounded-lg border border-slate-200 object-cover dark:border-slate-700" />
        </button>
      ) : (
        <div className="grid aspect-[4/3] w-full place-items-center rounded-lg border border-dashed border-slate-300 text-center text-xs text-slate-400 dark:border-slate-700">
          {empty}
        </div>
      )}
      <figcaption className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</figcaption>
      {zoom && src && (
        <div role="dialog" aria-label={label} onClick={() => setZoom(false)} className="fixed inset-0 z-50 grid cursor-zoom-out place-items-center bg-black/85 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={label} className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </figure>
  );
}

export function PhotoPair({ ticket, officerSrc }: { ticket: Ticket; officerSrc?: string | null }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Photo src={ticket.photoUrl} label="Citizen photo" empty="Citizen sent no photo" />
      <Photo src={officerSrc ?? ticket.verification?.photoUrl} label="Officer on-site photo" empty="Not captured yet" />
    </div>
  );
}

/** "AI match check: same issue? yes/no + confidence + reason" */
export function MatchResult({ match }: { match: MatchCheck | null | undefined }) {
  if (match === undefined) return null;
  if (match === null) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
        🤖 AI match check unavailable right now. Decide from the photos.
      </div>
    );
  }
  const pct = Math.round(match.confidence * 100);
  const ok = match.same_issue;
  return (
    <div
      className={`rounded-lg border p-3 text-sm ${
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
          : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-100"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">
          🤖 AI match check: same issue? <span className="uppercase">{ok ? "Yes" : "No"}</span>
        </p>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold dark:bg-black/30">{pct}% confidence</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/60 dark:bg-black/30">
        <div className={`h-full ${ok ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2">{match.reason}</p>
    </div>
  );
}

/** Officer GPS vs complaint GPS, with a warning beyond 200 m. */
export function GpsCheck({ ticket, distanceM, accuracyM }: { ticket: Ticket; distanceM: number | null | undefined; accuracyM?: number | null }) {
  if (ticket.lat == null || ticket.lng == null) {
    return <p className="text-xs text-slate-500 dark:text-slate-400">📍 Complaint has no GPS location, so distance can’t be checked.</p>;
  }
  if (distanceM == null) {
    return <p className="text-xs text-slate-500 dark:text-slate-400">📍 Officer location not captured.</p>;
  }
  const far = distanceM > GPS_WARN_METERS;
  return (
    <div
      role={far ? "alert" : undefined}
      className={`rounded-lg px-3 py-2 text-sm ${
        far ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
      }`}
    >
      {far ? "⚠️ " : "📍 "}
      Officer was <b>{formatDistance(distanceM)}</b> from the complaint location
      {accuracyM ? ` (±${accuracyM} m)` : ""}.
      {far && ` More than ${GPS_WARN_METERS} m away. Check that the right spot was visited.`}
    </div>
  );
}

export function MapsButton({ ticket, className = "" }: { ticket: Ticket; className?: string }) {
  return (
    <a
      href={mapsUrl(ticket)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-navy-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 ${className}`}
    >
      🗺️ Open in Google Maps
    </a>
  );
}

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "–");

/** Who did what, when, and the red flags an approver should see. */
export function AccountabilityBox({ ticket }: { ticket: Ticket }) {
  const v = ticket.verification;
  const flags: string[] = [];
  if (v?.match && !v.match.same_issue) flags.push("AI says the photos do not show the same issue");
  if (v?.match && v.match.same_issue && v.match.confidence < 0.6) flags.push("AI match confidence is low");
  if (v?.match === null) flags.push("AI match check was unavailable");
  if (v?.distanceM != null && v.distanceM > GPS_WARN_METERS) flags.push(`Officer was ${formatDistance(v.distanceM)} from the site`);
  if (v && v.distanceM == null) flags.push("No GPS comparison available");
  if (ticket.duplicateOf) flags.push(`Possible duplicate of #${ticket.duplicateOf}`);
  if ((ticket.reportsCount ?? 1) > 1) flags.push(`Reported by ${ticket.reportsCount} citizens`);
  const sentBack = ticket.timeline.filter((e) => e.note.startsWith("Sent back")).length;
  if (sentBack) flags.push(`Sent back for re-verification ${sentBack}×`);

  const rows: [string, string][] = [
    ["Reported by", `${ticket.citizenName} · ${fmt(ticket.createdAt)}`],
    ["Assigned to", ticket.assignedTo ?? "–"],
    ["Verified by", v ? `${v.capturedBy} · ${fmt(v.verifiedAt ?? v.capturedAt)}` : "–"],
    ["Officer GPS", v?.lat != null ? `${v.lat.toFixed(5)}, ${v.lng?.toFixed(5)}${v.accuracyM ? ` (±${v.accuracyM} m)` : ""}` : "Not captured"],
  ];

  return (
    <section className="rounded-xl border border-navy-200 bg-navy-50/60 p-3 text-sm dark:border-navy-800 dark:bg-navy-950/40">
      <h4 className="font-semibold text-navy-900 dark:text-navy-100">🧾 Verification record</h4>
      <dl className="mt-2 space-y-1">
        {rows.map(([k, val]) => (
          <div key={k} className="flex gap-2">
            <dt className="w-24 shrink-0 text-slate-500 dark:text-slate-400">{k}</dt>
            <dd className="min-w-0 break-words text-slate-800 dark:text-slate-200">{val}</dd>
          </div>
        ))}
      </dl>
      {flags.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {flags.map((f) => (
            <li key={f} className="rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
              ⚠️ {f}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100">
          ✓ No red flags: photos match and officer was on site.
        </p>
      )}
    </section>
  );
}
