"use client";

import { useState } from "react";
import { accountabilityFor } from "@/lib/wards";
import type { Ticket } from "@/lib/types";
import { Spinner } from "./Badges";

const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function DemoTag() {
  return (
    <span
      title="Ward, officer and contractor details are fictional placeholders for this demo"
      className="rounded-full border border-dashed border-amber-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300"
    >
      Demo data
    </span>
  );
}

/** Who is responsible for this ticket: ward, officer, and for roads the contractor + maintenance period. */
export function WardAccountability({ ticket }: { ticket: Ticket }) {
  const acc = accountabilityFor(ticket);
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-semibold text-navy-900 dark:text-navy-100">🏷️ Accountability</h4>
        <DemoTag />
      </div>
      {!acc ? (
        <p className="mt-1.5 text-slate-500 dark:text-slate-400">
          Ward not identified. Add a known area (e.g. Koramangala, Jayanagar) or GPS location to see who is responsible.
        </p>
      ) : (
        <dl className="mt-2 space-y-1">
          <Row label="Ward" value={`Ward ${acc.ward.number} – ${acc.ward.name}`} />
          <Row
            label="Officer"
            value={
              <>
                <b>{acc.officer.name}</b>, {acc.officer.designation}
                <br />
                <a href={`tel:${acc.officer.phone.replace(/\s/g, "")}`} className="text-navy-600 underline dark:text-navy-300">
                  {acc.officer.phone}
                </a>
              </>
            }
          />
          {acc.contractor && (
            <>
              <Row label="Contractor" value={acc.contractor.name} />
              <Row label="Tender no." value={<span className="font-mono text-xs">{acc.contractor.tender}</span>} />
              <Row label="Maintenance" value={`${fmtDate(acc.contractor.maintenanceFrom)} – ${fmtDate(acc.contractor.maintenanceTo)}`} />
              <Row
                label="Within period?"
                value={
                  acc.contractor.withinMaintenance ? (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                      Yes: contractor must repair at own cost
                    </span>
                  ) : (
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">No: maintenance period over</span>
                  )
                }
              />
            </>
          )}
        </dl>
      )}
      <FormalComplaint ticket={ticket} />
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="min-w-0 break-words text-slate-800 dark:text-slate-200">{value}</dd>
    </div>
  );
}

interface Email {
  to: string;
  subject: string;
  body: string;
}

/** "Generate formal complaint": AI drafts a ready-to-send email the citizen can copy or open in their mail app. */
export function FormalComplaint({ ticket }: { ticket: Ticket }) {
  const [email, setEmail] = useState<Email | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(ticket.id)}/complaint`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.email) setEmail(data.email);
      else setError(data.error || "Couldn't draft the complaint. Please try again.");
    } catch {
      setError("Can't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!email) return;
    const text = `To: ${email.to}\nSubject: ${email.subject}\n\n${email.body}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older/insecure browsers: fall back to a hidden textarea.
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!email) {
    return (
      <div className="mt-3">
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-navy-300 bg-navy-50 text-sm font-semibold text-navy-800 hover:bg-navy-100 disabled:opacity-60 dark:border-navy-700 dark:bg-navy-950 dark:text-navy-100 dark:hover:bg-navy-900"
        >
          {busy ? (
            <>
              <Spinner className="h-4 w-4" /> AI is drafting your complaint…
            </>
          ) : (
            "✉️ Generate formal complaint"
          )}
        </button>
        {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-navy-200 bg-navy-50/60 p-3 dark:border-navy-800 dark:bg-navy-950/50">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        <b>To:</b> {email.to}
      </p>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{email.subject}</p>
      <textarea
        readOnly
        value={email.body}
        rows={10}
        className="w-full rounded-md border border-slate-300 bg-white p-2 font-sans text-sm leading-relaxed dark:border-slate-700 dark:bg-slate-950"
        aria-label="Complaint email body"
      />
      <p className="text-[11px] text-amber-700 dark:text-amber-300">⚠️ Officer and contractor details are demo data. Check them before sending.</p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={copy} className="min-h-11 rounded-lg bg-navy-900 text-sm font-semibold text-white hover:bg-navy-800 dark:bg-navy-500 dark:hover:bg-navy-400">
          {copied ? "✓ Copied" : "📋 Copy email"}
        </button>
        <a
          href={`mailto:?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`}
          className="flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-sm font-medium text-navy-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          📧 Open in mail app
        </a>
      </div>
      <button type="button" onClick={generate} disabled={busy} className="w-full py-1 text-xs font-medium text-navy-600 hover:underline disabled:opacity-60 dark:text-navy-300">
        {busy ? "Redrafting…" : "↻ Redraft"}
      </button>
    </div>
  );
}
