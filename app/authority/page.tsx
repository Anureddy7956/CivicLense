"use client";

import { useEffect, useState } from "react";
import { runAction, useTickets } from "@/lib/store";
import { canDo, type Action } from "@/lib/workflow";
import { STATUS_LABEL, type Ticket } from "@/lib/types";
import RoleGate from "@/components/RoleGate";
import TicketCard from "@/components/TicketCard";
import { Spinner, StatusBadge } from "@/components/Badges";
import { AccountabilityBox, GpsCheck, MapsButton, MatchResult, PhotoPair } from "@/components/Evidence";
import { TimelineList } from "@/components/Timeline";

export default function AuthorityPage() {
  return (
    <RoleGate role="authority">
      <Authority />
    </RoleGate>
  );
}

function Authority() {
  const { tickets, error, refresh } = useTickets();
  const [toast, setToast] = useState<string | null>(null);
  const [showPipeline, setShowPipeline] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const review = (tickets ?? []).filter((t) => t.status === "Field Verified");
  const unassigned = (tickets ?? []).filter((t) => t.status === "Submitted");
  const pipeline = (tickets ?? []).filter((t) => t.status === "Assigned");

  const done = (msg: string) => {
    setToast(msg);
    void refresh();
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight text-navy-900 dark:text-white">Approvals</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Field-verified tickets waiting for your decision, most severe first.</p>
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/60 dark:text-red-200">⚠️ {error}</p>}

      {tickets === null ? (
        <div className="grid place-items-center py-24 text-navy-700 dark:text-navy-300">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <>
          {unassigned.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2 text-lg font-semibold text-navy-900 dark:text-white">Needs a field officer ({unassigned.length})</h2>
              <div className="space-y-3">
                {unassigned.map((t) => (
                  <AssignCard key={t.id} t={t} onDone={done} />
                ))}
              </div>
            </section>
          )}

          <section className="mt-6">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-navy-900 dark:text-white">
              Awaiting approval
              <span className="rounded-full bg-navy-100 px-2 text-sm text-navy-800 dark:bg-navy-800 dark:text-navy-100">{review.length}</span>
            </h2>
            <div className="space-y-4">
              {review.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                  Nothing to approve. Tickets appear here once a field officer verifies them on site.
                </p>
              ) : (
                review.map((t) => <ReviewCard key={t.id} t={t} onDone={done} />)
              )}
            </div>
          </section>

          <section className="mt-8">
            <button
              onClick={() => setShowPipeline(!showPipeline)}
              className="flex min-h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-left text-sm font-medium dark:border-slate-800 dark:bg-slate-900"
              aria-expanded={showPipeline}
            >
              <span>Not yet field verified ({pipeline.length}): view only</span>
              <span aria-hidden>{showPipeline ? "▴" : "▾"}</span>
            </button>
            {showPipeline && (
              <div className="mt-3 space-y-3">
                {pipeline.map((t) => (
                  <TicketCard key={t.id} ticket={t} compact>
                    <DisabledApprove t={t} />
                  </TicketCard>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {toast && (
        <div role="status" className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-xl bg-navy-900 px-4 py-3 text-center text-sm font-medium text-white shadow-lg md:bottom-6 dark:bg-navy-700">
          {toast}
        </div>
      )}
    </div>
  );
}

/** Approve button for tickets that aren't field verified: disabled, with a tooltip and visible hint (no hover on phones). */
function DisabledApprove({ t }: { t: Ticket }) {
  const why = `Can't approve: this ticket is "${STATUS_LABEL[t.status]}". Only Field Verified tickets can be approved.`;
  return (
    <div>
      <span title={why} className="block cursor-not-allowed">
        <button disabled aria-disabled className="pointer-events-none min-h-11 w-full rounded-lg bg-slate-200 text-sm font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-500">
          ✅ Approve & dispatch work crew
        </button>
      </span>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">🔒 {why}</p>
    </div>
  );
}

function AssignCard({ t, onDone }: { t: Ticket; onDone: (m: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function assign() {
    setBusy(true);
    const r = await runAction(t.id, { action: "assign", role: "authority" });
    setBusy(false);
    if (r.ok) onDone(`#${t.id} assigned to field officer`);
    else setErr(r.error);
  }
  return (
    <TicketCard ticket={t} compact>
      <button onClick={assign} disabled={busy} className="min-h-11 w-full rounded-lg bg-sky-600 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60">
        {busy ? "Assigning…" : "🦺 Assign to field officer"}
      </button>
      {err && <p className="mt-1 text-sm text-rose-600">{err}</p>}
    </TicketCard>
  );
}

const DECISIONS: { action: Extract<Action, "approve" | "send_back" | "reject">; label: string; style: string; done: string }[] = [
  { action: "approve", label: "✅ Approve & dispatch work crew", style: "bg-emerald-600 hover:bg-emerald-700 text-white", done: "approved, crew dispatched" },
  { action: "send_back", label: "↩️ Send back for re-verification", style: "bg-amber-500 hover:bg-amber-600 text-white", done: "sent back to field officer" },
  { action: "reject", label: "✕ Reject", style: "bg-rose-600 hover:bg-rose-700 text-white", done: "rejected" },
];

function ReviewCard({ t, onDone }: { t: Ticket; onDone: (m: string) => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const v = t.verification;
  const reasonOk = reason.trim().length >= 3;

  async function decide(d: (typeof DECISIONS)[number]) {
    if (!reasonOk) return setErr("A reason is required for every decision.");
    setBusy(d.action);
    setErr(null);
    const r = await runAction(t.id, { action: d.action, role: "authority", note: reason });
    setBusy(null);
    if (r.ok) onDone(`#${t.id} ${d.done}`);
    else setErr(r.error);
  }

  return (
    <TicketCard ticket={t}>
      <div className="space-y-3">
        <PhotoPair ticket={t} />
        <MatchResult match={v?.match} />
        <GpsCheck ticket={t} distanceM={v?.distanceM} accuracyM={v?.accuracyM} />
        {v?.note && (
          <blockquote className="rounded-lg border-l-4 border-navy-400 bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">🦺 Officer note ({v.outcome})</p>
            <p className="mt-0.5">{v.note}</p>
          </blockquote>
        )}
        <AccountabilityBox ticket={t} />
        <div className="flex flex-wrap gap-2">
          <MapsButton ticket={t} className="flex-1" />
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className="min-h-11 flex-1 rounded-lg border border-slate-300 px-3 text-sm font-medium dark:border-slate-700"
          >
            {showTimeline ? "Hide" : "Show"} timeline
          </button>
        </div>
        {showTimeline && (
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
            <TimelineList ticket={t} />
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor={`reason-${t.id}`} className="text-sm font-semibold">
              Reason for your decision <span className="text-rose-600">*</span>
            </label>
            <StatusBadge status={t.status} />
          </div>
          <textarea
            id={`reason-${t.id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="e.g. Verified with matching photos; dispatch BBMP road crew today."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <div className="mt-2 grid gap-2">
            {DECISIONS.map((d) => {
              const allowed = canDo(d.action, "authority", t);
              const why = !allowed
                ? `Only Field Verified tickets can be ${d.action === "approve" ? "approved" : "decided"}.`
                : !reasonOk
                  ? "Write a reason first."
                  : undefined;
              return (
                <span key={d.action} title={why} className={`block ${allowed && reasonOk ? "" : "cursor-not-allowed"}`}>
                  <button
                    onClick={() => decide(d)}
                    disabled={!allowed || !reasonOk || busy !== null}
                    className={`min-h-12 w-full rounded-lg text-sm font-semibold transition disabled:pointer-events-none disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-800 ${d.style}`}
                  >
                    {busy === d.action ? "Saving…" : d.label}
                  </button>
                </span>
              );
            })}
          </div>
          {!reasonOk && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Buttons unlock after you write a reason.</p>}
          {err && <p className="mt-1 text-sm text-rose-600">{err}</p>}
        </div>
      </div>
    </TicketCard>
  );
}
