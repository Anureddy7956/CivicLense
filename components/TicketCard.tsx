"use client";

import { useState } from "react";
import { CATEGORY_ICON, SEVERITY_BORDER } from "@/lib/departments";
import { STATUSES, type Status, type Ticket } from "@/lib/types";
import { CategoryBadge, SeverityBadge, StatusBadge } from "./Badges";

export function timeAgo(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

interface Props {
  ticket: Ticket;
  onStatusChange?: (status: Status) => void; // when given, shows the officer status dropdown
}

export default function TicketCard({ ticket: t, onStatusChange }: Props) {
  const [zoom, setZoom] = useState(false);
  const isEnglish = /^english$/i.test(t.triage.detected_language);
  const resolved = t.status === "Resolved";

  return (
    <article
      className={`rounded-xl border border-l-4 bg-white shadow-sm transition ${SEVERITY_BORDER[t.triage.severity]} ${resolved ? "opacity-60" : ""}`}
    >
      <div className="flex gap-4 p-4 sm:p-5">
        {/* Photo thumbnail or category placeholder */}
        <button
          type="button"
          onClick={() => t.photo && setZoom(true)}
          className={`grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-navy-50 text-3xl sm:h-24 sm:w-24 ${t.photo ? "cursor-zoom-in" : "cursor-default"}`}
          aria-label={t.photo ? "Enlarge photo" : "No photo"}
        >
          {t.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.photo} alt="Complaint photo" className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden>{CATEGORY_ICON[t.triage.category]}</span>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-navy-700">#{t.id}</span>
            <SeverityBadge severity={t.triage.severity} />
            <CategoryBadge category={t.triage.category} />
            {!onStatusChange && <StatusBadge status={t.status} />}
            {t.duplicateOf && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                Possible duplicate of #{t.duplicateOf}
              </span>
            )}
          </div>

          <h3 className="mt-1.5 text-base font-semibold leading-snug text-navy-900 sm:text-lg">{t.triage.title}</h3>
          <p className="mt-0.5 text-sm text-slate-700">
            <span className="font-medium">Why {t.triage.severity.toLowerCase()}:</span> {t.triage.severity_reason}
          </p>

          <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            <Field label="Department" value={t.triage.department} strong />
            <Field label="Area" value={t.area || "Not specified"} />
            <Field label="Language" value={t.triage.detected_language} />
            <Field label="Reported" value={timeAgo(t.createdAt)} title={new Date(t.createdAt).toLocaleString("en-IN")} />
          </dl>

          <div className="mt-3 space-y-1.5 rounded-lg bg-slate-50 p-3 text-sm">
            <p>
              <span className="text-slate-500">English summary: </span>
              {t.triage.english_summary}
            </p>
            {!isEnglish && t.text && (
              <p lang="und">
                <span className="text-slate-500">Original: </span>
                {t.text}
              </p>
            )}
            {t.triage.photo_observation && (
              <p>
                <span className="text-slate-500">📷 Photo shows: </span>
                {t.triage.photo_observation}
              </p>
            )}
          </div>

          {onStatusChange && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <label htmlFor={`status-${t.id}`} className="text-slate-500">
                Status
              </label>
              <select
                id={`status-${t.id}`}
                value={t.status}
                onChange={(e) => onStatusChange(e.target.value as Status)}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 font-medium focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-100"
              >
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {zoom && t.photo && (
        <div
          role="dialog"
          aria-label="Photo"
          onClick={() => setZoom(false)}
          className="fixed inset-0 z-50 grid cursor-zoom-out place-items-center bg-black/80 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={t.photo} alt="Complaint photo, enlarged" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </article>
  );
}

function Field({ label, value, strong, title }: { label: string; value: string; strong?: boolean; title?: string }) {
  return (
    <div className="flex gap-2" title={title}>
      <dt className="w-24 shrink-0 text-slate-500">{label}</dt>
      <dd className={strong ? "font-semibold text-navy-800" : "text-slate-800"}>{value}</dd>
    </div>
  );
}
