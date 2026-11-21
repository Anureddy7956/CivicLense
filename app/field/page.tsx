"use client";

import { useEffect, useRef, useState } from "react";
import { compressImage, getLocation, runAction, useTickets } from "@/lib/store";
import type { Ticket, VerifyOutcome } from "@/lib/types";
import RoleGate from "@/components/RoleGate";
import TicketCard from "@/components/TicketCard";
import { Spinner } from "@/components/Badges";
import { GpsCheck, MapsButton, MatchResult, Photo, PhotoPair } from "@/components/Evidence";
import HowTo from "@/components/HowTo";

export default function FieldPage() {
  return (
    <RoleGate role="field_officer">
      <FieldOfficer />
    </RoleGate>
  );
}

function FieldOfficer() {
  const { tickets, error, refresh } = useTickets();
  const [verifyId, setVerifyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [workNote, setWorkNote] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const mine = (tickets ?? []).filter((t) => t.assignedTo !== null);
  const toVerify = mine.filter((t) => t.status === "Assigned"); // server sends severity-sorted
  const workOrders = mine.filter((t) => t.status === "Approved" || t.status === "In Progress");
  const verifying = tickets?.find((t) => t.id === verifyId) ?? null;

  async function work(t: Ticket, action: "start_work" | "resolve") {
    setBusyId(t.id);
    const r = await runAction(t.id, { action, role: "field_officer", note: workNote[t.id] });
    setBusyId(null);
    if (r.ok) {
      setToast(action === "start_work" ? `#${t.id}: work started` : `#${t.id}: marked resolved ✓`);
      setWorkNote((n) => ({ ...n, [t.id]: "" }));
      void refresh();
    } else setToast(r.error);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight text-navy-900 dark:text-white">Field work</h1>
      <p className="mt-1 mb-4 text-sm text-slate-600 dark:text-slate-400">Tickets assigned to you, most severe first.</p>
      <HowTo
        id="field"
        steps={[
          <>
            Tap <b>🗺️ Open in Google Maps</b> to navigate to the complaint.
          </>,
          <>
            At the spot, tap <b>✅ Verify on site</b> → <b>📷 Take on-site photo</b>. Allow location so your GPS is recorded.
          </>,
          <>
            Read the <b>AI match check</b> (does your photo show the same issue?) and the <b>distance warning</b> if you’re more than 200 m away.
          </>,
          <>
            Choose <b>Confirmed</b>, <b>Not found</b> or <b>Duplicate</b>, write a short note and submit. Confirmed tickets go to the Higher Authority.
          </>,
          <>
            After approval the ticket moves to <b>Work orders</b>: tap <b>🚧 Start work</b>, then <b>✓ Mark resolved</b> when finished.
          </>,
        ]}
      />
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/60 dark:text-red-200">⚠️ {error}</p>}

      {tickets === null ? (
        <div className="grid place-items-center py-24 text-navy-700 dark:text-navy-300">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <>
          <Section title="To verify on site" count={toVerify.length} empty="Nothing to verify right now. New complaints are assigned to you automatically.">
            {toVerify.map((t) => (
              <TicketCard key={t.id} ticket={t} compact>
                {t.verification && (
                  <p className="mb-2 text-xs font-medium text-amber-700 dark:text-amber-300">📷 Photo captured. Verification not submitted yet.</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <MapsButton ticket={t} />
                  <button
                    onClick={() => setVerifyId(t.id)}
                    className="min-h-11 rounded-lg bg-navy-900 px-3 text-sm font-semibold text-white hover:bg-navy-800 dark:bg-navy-500 dark:hover:bg-navy-400"
                  >
                    ✅ Verify on site
                  </button>
                </div>
              </TicketCard>
            ))}
          </Section>

          <Section title="Work orders" count={workOrders.length} empty="No approved work yet. Tickets appear here after the authority approves them.">
            {workOrders.map((t) => (
              <TicketCard key={t.id} ticket={t} compact>
                <label className="sr-only" htmlFor={`wn-${t.id}`}>
                  Work note
                </label>
                <input
                  id={`wn-${t.id}`}
                  value={workNote[t.id] ?? ""}
                  onChange={(e) => setWorkNote((n) => ({ ...n, [t.id]: e.target.value }))}
                  placeholder={t.status === "Approved" ? "Note (optional), e.g. crew of 4 on site" : "Note (optional), e.g. pothole filled and levelled"}
                  className="mb-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base sm:text-sm dark:border-slate-700 dark:bg-slate-950"
                />
                <div className="grid grid-cols-2 gap-2">
                  <MapsButton ticket={t} />
                  <button
                    disabled={busyId === t.id}
                    onClick={() => work(t, t.status === "Approved" ? "start_work" : "resolve")}
                    className={`min-h-11 rounded-lg px-3 text-sm font-semibold text-white disabled:opacity-60 ${
                      t.status === "Approved" ? "bg-violet-600 hover:bg-violet-700" : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {busyId === t.id ? "Saving…" : t.status === "Approved" ? "🚧 Start work" : "✓ Mark resolved"}
                  </button>
                </div>
              </TicketCard>
            ))}
          </Section>
        </>
      )}

      {verifying && (
        <VerifySheet
          ticket={verifying}
          onClose={() => setVerifyId(null)}
          onDone={(msg) => {
            setVerifyId(null);
            setToast(msg);
            void refresh();
          }}
        />
      )}

      {toast && (
        <div role="status" className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-xl bg-navy-900 px-4 py-3 text-center text-sm font-medium text-white shadow-lg md:bottom-6 dark:bg-navy-700">
          {toast}
        </div>
      )}
    </div>
  );
}

function Section({ title, count, empty, children }: { title: string; count: number; empty: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-navy-900 dark:text-white">
        {title}
        <span className="rounded-full bg-navy-100 px-2 text-sm text-navy-800 dark:bg-navy-800 dark:text-navy-100">{count}</span>
      </h2>
      <div className="space-y-3">
        {count === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            {empty}
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

const OUTCOMES: { value: VerifyOutcome; label: string; hint: string; style: string }[] = [
  { value: "Confirmed", label: "✅ Confirmed", hint: "Issue is real and at this spot", style: "peer-checked:bg-emerald-600 peer-checked:border-emerald-600" },
  { value: "Not found", label: "❌ Not found", hint: "Nothing wrong here", style: "peer-checked:bg-rose-600 peer-checked:border-rose-600" },
  { value: "Duplicate", label: "🔁 Duplicate", hint: "Already reported", style: "peer-checked:bg-amber-600 peer-checked:border-amber-600" },
];

/** Full-screen on phones: capture on-site photo + GPS, AI match check, note, outcome. */
function VerifySheet({ ticket, onClose, onDone }: { ticket: Ticket; onClose: () => void; onDone: (msg: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [local, setLocal] = useState<Ticket>(ticket);
  const [preview, setPreview] = useState<string | null>(null);
  const [stage, setStage] = useState<"idle" | "locating" | "checking">("idle");
  const [gpsNote, setGpsNote] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [outcome, setOutcome] = useState<VerifyOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Lock page scroll behind the sheet.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const v = local.verification;

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setGpsNote(null);
    try {
      const photo = await compressImage(file);
      setPreview(photo);
      setStage("locating");
      const fix = await getLocation().catch((err: Error) => {
        setGpsNote(err.message);
        return null;
      });
      setStage("checking");
      const r = await runAction(ticket.id, {
        action: "capture_evidence",
        role: "field_officer",
        photo,
        lat: fix?.lat ?? null,
        lng: fix?.lng ?? null,
        accuracyM: fix?.accuracyM ?? null,
      });
      if (r.ok) setLocal(r.ticket);
      else setError(r.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't use that photo.");
    } finally {
      setStage("idle");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit() {
    if (!outcome) return setError("Choose Confirmed, Not found or Duplicate.");
    if (note.trim().length < 3) return setError("Please add a short note about what you saw.");
    setSubmitting(true);
    setError(null);
    const r = await runAction(ticket.id, { action: "verify", role: "field_officer", outcome, note });
    setSubmitting(false);
    if (r.ok) onDone(outcome === "Confirmed" ? `#${ticket.id} verified → sent to authority` : `#${ticket.id} rejected as ${outcome === "Duplicate" ? "duplicate" : "invalid"}`);
    else setError(r.error);
  }

  const busy = stage !== "idle";

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 md:items-center md:p-6" role="dialog" aria-modal="true" aria-labelledby="verify-title">
      <div className="flex max-h-full w-full flex-col overflow-hidden bg-slate-50 md:max-w-2xl md:rounded-2xl dark:bg-slate-950">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] dark:border-slate-800 dark:bg-slate-900">
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full text-xl hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
            ←
          </button>
          <div className="min-w-0">
            <h2 id="verify-title" className="truncate font-semibold text-navy-900 dark:text-white">
              Verify on site · #{ticket.id}
            </h2>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{ticket.triage.title}</p>
          </div>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <section className="rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-slate-500 dark:text-slate-400">Citizen reported</p>
            <p className="mt-0.5">{ticket.triage.english_summary}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">📍 {ticket.area || "No area given"}</p>
            <MapsButton ticket={ticket} className="mt-2 w-full" />
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-navy-900 dark:text-white">1. On-site photo</h3>
            {v || preview ? (
              <PhotoPair ticket={local} officerSrc={busy ? preview : (v?.photoUrl ?? preview)} />
            ) : (
              <Photo src={ticket.photoUrl} label="Citizen photo" empty="Citizen sent no photo" />
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPhoto} className="hidden" id="onsite" />
            <label
              htmlFor="onsite"
              aria-disabled={busy}
              className={`flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-base font-semibold ${
                busy ? "pointer-events-none bg-slate-200 text-slate-500 dark:bg-slate-800" : "bg-navy-900 text-white hover:bg-navy-800 dark:bg-navy-500 dark:hover:bg-navy-400"
              }`}
            >
              {stage === "locating" ? (
                <>
                  <Spinner /> Getting GPS…
                </>
              ) : stage === "checking" ? (
                <>
                  <Spinner /> AI is comparing photos…
                </>
              ) : v ? (
                "📷 Retake on-site photo"
              ) : (
                "📷 Take on-site photo"
              )}
            </label>
            {gpsNote && <p className="text-xs text-amber-700 dark:text-amber-300">📍 {gpsNote} The photo was saved without GPS.</p>}
          </section>

          {v && !busy && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white">2. Checks</h3>
              <MatchResult match={v.match} />
              <GpsCheck ticket={local} distanceM={v.distanceM} accuracyM={v.accuracyM} />
            </section>
          )}

          {v && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white">3. Your finding</h3>
              <fieldset className="grid grid-cols-3 gap-2">
                <legend className="sr-only">Outcome</legend>
                {OUTCOMES.map((o) => (
                  <label key={o.value} className="cursor-pointer">
                    <input type="radio" name="outcome" value={o.value} checked={outcome === o.value} onChange={() => setOutcome(o.value)} className="peer sr-only" />
                    <span
                      className={`flex min-h-16 flex-col items-center justify-center rounded-xl border-2 border-slate-300 bg-white px-1 text-center text-sm font-semibold peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-navy-400 dark:border-slate-700 dark:bg-slate-900 ${o.style}`}
                    >
                      {o.label}
                      <span className="text-[10px] font-normal opacity-80">{o.hint}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
              <label htmlFor="vnote" className="block text-sm font-medium">
                Note <span className="text-rose-600">*</span>
              </label>
              <textarea
                id="vnote"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="What did you see on site? Size, risk, landmarks…"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </section>
          )}

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/60 dark:text-red-200">
              ⚠️ {error}
            </p>
          )}
        </div>

        <footer className="border-t border-slate-200 bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 dark:border-slate-800 dark:bg-slate-900">
          <button
            onClick={submit}
            disabled={!v || busy || submitting || !outcome || note.trim().length < 3}
            className="min-h-14 w-full rounded-xl bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800"
          >
            {submitting ? "Submitting…" : !v ? "Take an on-site photo first" : !outcome ? "Choose a finding" : note.trim().length < 3 ? "Add a note" : "Submit verification"}
          </button>
        </footer>
      </div>
    </div>
  );
}
