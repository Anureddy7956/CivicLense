"use client";

import { useMemo, useState } from "react";
import { useTickets } from "@/lib/useTickets";
import { resetDemoData, setStatus, sortTickets } from "@/lib/store";
import { CATEGORY_ICON, DEPARTMENT_LABELS } from "@/lib/departments";
import { CATEGORIES, SEVERITIES, STATUSES, type Category, type Severity, type Status } from "@/lib/types";
import TicketCard from "@/components/TicketCard";
import { Spinner } from "@/components/Badges";

export default function Dashboard() {
  const tickets = useTickets();
  const [category, setCategory] = useState<Category | "">("");
  const [department, setDepartment] = useState("");
  const [severity, setSeverity] = useState<Severity | "">("");
  const [status, setStatusFilter] = useState<Status | "">("");

  const visible = useMemo(() => {
    if (!tickets) return [];
    return sortTickets(
      tickets.filter(
        (t) =>
          (!category || t.triage.category === category) &&
          (!department || t.triage.department === department) &&
          (!severity || t.triage.severity === severity) &&
          (!status || t.status === status),
      ),
    );
  }, [tickets, category, department, severity, status]);

  if (!tickets) {
    return (
      <div className="grid place-items-center py-24 text-navy-700">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const total = tickets.length;
  const critical = tickets.filter((t) => t.triage.severity === "Critical" && t.status !== "Resolved").length;
  const open = tickets.filter((t) => t.status === "Open").length;
  const filtersOn = Boolean(category || department || severity || status);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-navy-900">Officer dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">Sorted by severity (Critical → Low), then newest first.</p>
        </div>
        <button
          onClick={() => confirm("Replace all tickets with the 8 sample tickets?") && resetDemoData()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          Reset demo data
        </button>
      </div>

      {/* Summary counts */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Total tickets" value={total} className="bg-navy-900 text-white" sub="text-navy-200" />
        <Stat
          label="Critical (unresolved)"
          value={critical}
          className="cursor-pointer border border-red-200 bg-red-50 text-red-700 hover:ring-2 hover:ring-red-300"
          sub="text-red-600"
          onClick={() => setSeverity(severity === "Critical" ? "" : "Critical")}
          active={severity === "Critical"}
        />
        <Stat
          label="Open"
          value={open}
          className="cursor-pointer border border-sky-200 bg-sky-50 text-sky-800 hover:ring-2 hover:ring-sky-300"
          sub="text-sky-700"
          onClick={() => setStatusFilter(status === "Open" ? "" : "Open")}
          active={status === "Open"}
        />
      </div>

      {/* Filters */}
      <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl border bg-white p-3 sm:grid-cols-5 sm:items-end">
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
            <option key={s}>{s}</option>
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
          className="col-span-2 rounded-md px-3 py-2 text-sm font-medium text-navy-600 hover:bg-navy-50 disabled:text-slate-300 disabled:hover:bg-transparent sm:col-span-1"
        >
          Clear filters
        </button>
      </div>

      <p className="mt-4 text-sm text-slate-500">
        Showing {visible.length} of {total} tickets
      </p>

      <div className="mt-2 space-y-3">
        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-white p-10 text-center text-slate-500">
            {total === 0 ? (
              <>No tickets yet. Click <b>Reset demo data</b> to load samples.</>
            ) : (
              "No tickets match these filters."
            )}
          </div>
        ) : (
          visible.map((t) => <TicketCard key={t.id} ticket={t} onStatusChange={(s) => setStatus(t.id, s)} />)
        )}
      </div>
    </div>
  );
}

function Stat(props: { label: string; value: number; className: string; sub: string; onClick?: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={!props.onClick}
      className={`rounded-xl p-4 text-left transition ${props.className} ${props.active ? "ring-2 ring-navy-500" : ""}`}
    >
      <p className="text-3xl font-bold sm:text-4xl">{props.value}</p>
      <p className={`mt-1 text-xs font-medium sm:text-sm ${props.sub}`}>{props.label}</p>
    </button>
  );
}

function Select(props: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
      {props.label}
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-100"
      >
        {props.children}
      </select>
    </label>
  );
}
