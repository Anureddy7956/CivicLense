"use client";

import { useState } from "react";
import { CATEGORY_ICON, SEVERITY_BORDER } from "@/lib/departments";
import type { Ticket } from "@/lib/types";
import { CategoryBadge, SeverityBadge, StatusBadge } from "./Badges";
import { WardAccountability } from "./Accountability";
import { isBoosted } from "@/lib/tickets";
import { mapsUrl } from "@/lib/workflow";

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
  compact?: boolean; // hide the summary/original-text panel
  children?: React.ReactNode; // role-specific actions rendered at the bottom
}

export default function TicketCard({ ticket: t, compact, children }: Props) {
  const [zoom, setZoom] = useState<string | null>(null);
  const [showReports, setShowReports] = useState(false);
  const count = t.reportsCount ?? 1;
  const isEnglish = /^english$/i.test(t.triage.detected_language);
  const closed = t.status === "Resolved" || t.status === "Rejected";

  return (
    <article
      className={`rounded-xl border border-l-4 border-slate-200 bg-white shadow-sm transition dark:border-slate-800 dark:bg-slate-900 ${SEVERITY_BORDER[t.triage.severity]} ${closed && !children ? "opacity-70" : ""}`}
    >
      <div className="flex gap-3 p-3.5 sm:gap-4 sm:p-5">
        {/* Photo thumbnail or category placeholder */}
        <button
          type="button"
          onClick={() => t.photoUrl && setZoom(t.photoUrl)}
          className={`grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-navy-50 text-2xl sm:h-24 sm:w-24 sm:text-3xl dark:bg-navy-900 ${t.photoUrl ? "cursor-zoom-in" : "cursor-default"}`}
          aria-label={t.photoUrl ? "Enlarge photo" : "No photo"}
        >
          {t.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.photoUrl} alt="Complaint photo" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden>{CATEGORY_ICON[t.triage.category]}</span>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="font-mono text-xs font-semibold text-navy-700 dark:text-navy-300">#{t.id}</span>
            <SeverityBadge severity={t.triage.severity} />
            <CategoryBadge category={t.triage.category} />
            <StatusBadge status={t.status} />
            {count > 1 && (
              <span className="rounded-full bg-fuchsia-100 px-2.5 py-0.5 text-xs font-semibold text-fuchsia-800 dark:bg-fuchsia-900/50 dark:text-fuchsia-200">
                👥 Reported by {count} citizens
              </span>
            )}
            {isBoosted(t) && (
              <span
                title="3 or more citizens reported this, so it is ranked one level higher"
                className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-900/50 dark:text-red-200"
              >
                🔥 Priority boosted
              </span>
            )}
            {t.duplicateOf && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                Possible duplicate of #{t.duplicateOf}
              </span>
            )}
          </div>

          <h3 className="mt-1.5 text-base font-semibold leading-snug text-navy-900 sm:text-lg dark:text-white">{t.triage.title}</h3>
          <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">
            <span className="font-medium">Why {t.triage.severity.toLowerCase()}:</span> {t.triage.severity_reason}
          </p>

          <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            <Field label="Department" value={t.triage.department} strong />
            <Field
              label="Area"
              value={
                <>
                  {t.area || "Not specified"}
                  {(t.lat != null || t.area) && (
                    <>
                      {" · "}
                      <a href={mapsUrl(t)} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap text-navy-600 underline dark:text-navy-300">
                        🗺️ Map
                      </a>
                    </>
                  )}
                </>
              }
            />
            <Field label="Language" value={t.triage.detected_language} />
            <Field label="Reported" value={timeAgo(t.createdAt)} title={new Date(t.createdAt).toLocaleString("en-IN")} />
            {t.triageMs != null && <Field label="AI triage" value={`⚡ Triaged in ${(t.triageMs / 1000).toFixed(1)} seconds`} />}
          </dl>
        </div>
      </div>

      {!compact && (
        <div className="space-y-1.5 border-t border-slate-100 bg-slate-50 px-3.5 py-3 text-sm sm:px-5 dark:border-slate-800 dark:bg-slate-900/60">
          <p>
            <span className="text-slate-500 dark:text-slate-400">English summary: </span>
            {t.triage.english_summary}
          </p>
          {!isEnglish && t.text && (
            <p lang="und">
              <span className="text-slate-500 dark:text-slate-400">Original: </span>
              {t.text}
            </p>
          )}
          {t.triage.photo_observation && (
            <p>
              <span className="text-slate-500 dark:text-slate-400">📷 Photo shows: </span>
              {t.triage.photo_observation}
            </p>
          )}
        </div>
      )}
      {t.voice && (
        <div className="border-t border-slate-100 px-3.5 py-3 text-sm sm:px-5 dark:border-slate-800">
          <p className="mb-1.5 text-slate-500 dark:text-slate-400">
            🎙️ Voice complaint · {t.voice.language} · {t.voice.durationSec}s
          </p>
          <audio controls preload="none" src={t.voice.audioUrl} className="h-10 w-full" aria-label={`Voice complaint for ticket ${t.id}`} />
          {t.voice.englishTranslation && !compact && (
            <p className="mt-1.5 text-slate-500 dark:text-slate-400">English: {t.voice.englishTranslation}</p>
          )}
        </div>
      )}
      {t.reports?.length > 0 && (
        <div className="border-t border-slate-100 px-3.5 py-2 text-sm sm:px-5 dark:border-slate-800">
          <button type="button" onClick={() => setShowReports(!showReports)} className="min-h-9 font-medium text-navy-700 dark:text-navy-200" aria-expanded={showReports}>
            {showReports ? "▴ Hide" : "▾ Show"} {t.reports.length} more report{t.reports.length > 1 ? "s" : ""} of this issue
          </button>
          {showReports && (
            <ul className="mt-1 space-y-2">
              {t.reports.map((r, i) => (
                <li key={i} className="flex gap-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60">
                  {r.photoUrl && (
                    <button type="button" onClick={() => setZoom(r.photoUrl)} className="shrink-0" aria-label="Enlarge photo">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.photoUrl} alt="" loading="lazy" className="h-12 w-12 rounded object-cover" />
                    </button>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {timeAgo(r.at)}
                      {r.area ? ` · ${r.area}` : ""}
                    </p>
                    {r.text && <p className="break-words">{r.text}</p>}
                    {r.audioUrl && <audio controls preload="none" src={r.audioUrl} className="mt-1 h-9 w-full" aria-label="Voice report" />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="border-t border-slate-100 px-3.5 py-3 sm:px-5 dark:border-slate-800">
        <WardAccountability ticket={t} />
      </div>
      {children && <div className="border-t border-slate-100 px-3.5 py-3 sm:px-5 dark:border-slate-800">{children}</div>}

      {zoom && (
        <div
          role="dialog"
          aria-label="Photo"
          onClick={() => setZoom(null)}
          className="fixed inset-0 z-50 grid cursor-zoom-out place-items-center bg-black/85 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="Complaint photo, enlarged" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </article>
  );
}

function Field({ label, value, strong, title }: { label: string; value: React.ReactNode; strong?: boolean; title?: string }) {
  return (
    <div className="flex gap-2" title={title}>
      <dt className="w-24 shrink-0 text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={`min-w-0 break-words ${strong ? "font-semibold text-navy-800 dark:text-navy-200" : "text-slate-800 dark:text-slate-200"}`}>
        {value}
      </dd>
    </div>
  );
}
