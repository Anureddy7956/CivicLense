"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTickets } from "@/lib/store";
import { CATEGORY_ICON, DEPARTMENT_LABELS } from "@/lib/departments";
import { CATEGORIES, SEVERITIES, STATUSES, STATUS_LABEL, type Category, type Severity, type Status, type Ticket } from "@/lib/types";
import { isOpen } from "@/lib/workflow";
import RoleGate from "@/components/RoleGate";
import { TimelineList } from "@/components/Timeline";
import TicketCard from "@/components/TicketCard";
import HowTo from "@/components/HowTo";
import { Spinner } from "@/components/Badges";

export default function DashboardPage() {
  return (
    <RoleGate role={["field_officer", "authority"]}>
      <Dashboard />
    </RoleGate>
  );
}

function Dashboard() {
  const { tickets, error } = useTickets();
  const [category, setCategory] = useState<Category | "">("");
  const [department, setDepartment] = useState("");
  const [severity, setSeverity] = useState<Severity | "">("");
  const [status, setStatusFilter] = useState<Status | "">("");

  // Server already returns tickets sorted: Critical → Low, then newest first.
  const visible = useMemo(
    () =>
      (tickets ?? []).filter(
        (t) =>
          (!category || t.triage.category === category) &&
          (!department || t.triage.department === department) &&
          (!severity || t.triage.severity === severity) &&
          (!status || t.status === status),
      ),
    [tickets, category, department, severity, status],
  );

  const filtersOn = Boolean(category || department || severity || status);
  const total = tickets?.length ?? 0;
  const critical = tickets?.filter((t) => t.triage.severity === "Critical" && isOpen(t.status)).length ?? 0;
  const open = tickets?.filter((t) => isOpen(t.status)).length ?? 0;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-navy-900 dark:text-white">Officer dashboard</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Sorted by severity (Critical → Low, 🔥 boosted when 3+ citizens report), then newest first.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Live: updates automatically
        </span>
      </div>

      <div className="mt-4">
        <HowTo
          id="dashboard"
          steps={[
            <>Every complaint in the city, most severe first. New ones appear by themselves within a few seconds.</>,
            <>
              Tap the <b>Critical</b> card, or use the filters, to narrow by category, department, severity or status.
            </>,
            <>
              Repeat reports of the same issue (same ward, within 7 days) are merged: look for <b>👥 Reported by N citizens</b>. At 3 or more it’s <b>🔥 boosted</b> one priority level.
            </>,
            <>
              Each ticket shows the photo, the <b>▶ voice clip</b>, the original text and an English summary. Tap <b>Show timeline</b> to see every action and note.
            </>,
          ]}
        />
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:bg-red-950/60 dark:text-red-200">
          ⚠️ {error}
        </div>
      )}

      {/* Summary counts */}
      <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
        <Stat label="Total tickets" value={total} className="bg-navy-900 text-white dark:bg-navy-800" sub="text-navy-200" />
        <Stat
          label="Critical"
          value={critical}
          className="border border-red-200 bg-red-50 text-red-700 hover:ring-2 hover:ring-red-300 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
          sub="text-red-600 dark:text-red-400"
          onClick={() => setSeverity(severity === "Critical" ? "" : "Critical")}
          active={severity === "Critical"}
        />
        <Stat
          label="Open (not closed)"
          value={open}
          className="border border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300"
          sub="text-sky-700 dark:text-sky-400"
        />
      </div>

      {/* Filters */}
      <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-5 sm:items-end dark:border-slate-800 dark:bg-slate-900">
        <Select label="Category" value={category} onChange={(v) => setCategory(v as Category | "")}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_ICON[c]} {c[0].toUpperCase() + c.slice(1)}
            </option>
          ))}
        </Select>
        <Select label="Department" value={department} onChange={setDepartment}>
          <option value="">All departments</option>
          {DEPARTMENT_LABELS.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </Select>
        <Select label="Severity" value={severity} onChange={(v) => setSeverity(v as Severity | "")}>
          <option value="">All severities</option>
          {[...SEVERITIES].reverse().map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <Select label="Status" value={status} onChange={(v) => setStatusFilter(v as Status | "")}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        <button
          disabled={!filtersOn}
          onClick={() => {
            setCategory("");
            setDepartment("");
            setSeverity("");
            setStatusFilter("");
          }}
          className="col-span-2 min-h-10 rounded-md px-3 py-2 text-sm font-medium text-navy-600 hover:bg-navy-50 disabled:text-slate-300 disabled:hover:bg-transparent sm:col-span-1 dark:text-navy-300 dark:hover:bg-slate-800 dark:disabled:text-slate-600"
        >
          Clear filters
        </button>
      </div>

      {tickets === null ? (
        <div className="grid place-items-center py-24 text-navy-700 dark:text-navy-300">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Showing {visible.length} of {total} tickets
          </p>
          <div className="mt-2 space-y-3">
            {visible.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                {total === 0 ? (
                  <>
                    <p className="text-3xl">📭</p>
                    <p className="mt-2 font-medium text-slate-700 dark:text-slate-200">No complaints yet</p>
                    <p className="mt-1 text-sm">
                      Complaints appear here automatically as citizens report them.{" "}
                      <Link href="/" className="font-medium text-navy-600 underline dark:text-navy-300">
                        Report one
                      </Link>{" "}
                      to see how it works.
                    </p>
                  </>
                ) : (
                  "No tickets match these filters."
                )}
              </div>
            ) : (
              visible.map((t) => <DashboardRow key={t.id} t={t} />)
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Stat(props: { label: string; value: number; className: string; sub: string; onClick?: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={!props.onClick}
      className={`rounded-xl p-3 text-left transition sm:p-4 ${props.onClick ? "cursor-pointer" : ""} ${props.className} ${props.active ? "ring-2 ring-navy-500 dark:ring-navy-300" : ""}`}
    >
      <p className="text-2xl font-bold sm:text-4xl">{props.value}</p>
      <p className={`mt-1 text-xs font-medium sm:text-sm ${props.sub}`}>{props.label}</p>
    </button>
  );
}

function Select(props: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
      {props.label}
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-navy-700"
      >
        {props.children}
      </select>
    </label>
  );
}

function DashboardRow({ t }: { t: Ticket }) {
  const [open, setOpen] = useState(false);
  return (
    <TicketCard ticket={t}>
      <button onClick={() => setOpen(!open)} className="min-h-10 w-full text-left text-sm font-medium text-navy-700 dark:text-navy-200" aria-expanded={open}>
        {open ? "▴ Hide" : "▾ Show"} timeline ({t.timeline.length} steps)
      </button>
      {open && (
        <div className="mt-2">
          <TimelineList ticket={t} />
        </div>
      )}
    </TicketCard>
  );
}
