import { STEPS } from "@/lib/workflow";
import { STATUS_LABEL, type Ticket } from "@/lib/types";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** Visual progress through the happy path. A rejection shows as a red step where it happened. */
export function StatusStepper({ ticket }: { ticket: Ticket }) {
  const rejected = ticket.status === "Rejected";
  // Furthest happy-path step reached (from the timeline, so "sent back" doesn't erase history incorrectly).
  const reachedIdx = rejected
    ? Math.max(...ticket.timeline.filter((e) => e.status !== "Rejected").map((e) => STEPS.indexOf(e.status)), 0)
    : STEPS.indexOf(ticket.status);
  const steps = rejected ? [...STEPS.slice(0, reachedIdx + 1), "Rejected" as const] : STEPS;
  const lastAt = (s: string) => [...ticket.timeline].reverse().find((e) => e.status === s)?.at;

  return (
    <ol className="relative space-y-0" aria-label="Ticket progress">
      {steps.map((s, i) => {
        const done = rejected ? true : i <= reachedIdx;
        const current = rejected ? s === "Rejected" : i === reachedIdx;
        const isRej = s === "Rejected";
        const at = done ? lastAt(s) : undefined;
        return (
          <li key={s} className="relative flex gap-3 pb-4 last:pb-0">
            {i < steps.length - 1 && (
              <span
                className={`absolute left-[13px] top-7 h-[calc(100%-1.5rem)] w-0.5 ${done && !current ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`}
                aria-hidden
              />
            )}
            <span
              className={`relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                isRej
                  ? "bg-rose-600 text-white"
                  : current
                    ? "bg-navy-600 text-white ring-4 ring-navy-100 dark:ring-navy-800"
                    : done
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
              }`}
              aria-hidden
            >
              {isRej ? "✕" : done && !current ? "✓" : i + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className={`text-sm font-semibold ${done ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"}`}>
                {STATUS_LABEL[s]}
                {current && !isRej && <span className="ml-2 text-xs font-medium text-navy-600 dark:text-navy-300">← now</span>}
              </p>
              {at && <p className="text-xs text-slate-500 dark:text-slate-400">{fmt(at)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const ROLE_ICON: Record<string, string> = { citizen: "🙋", field_officer: "🦺", authority: "🏛️", system: "🤖" };

/** Full audit trail: every status change with who, when and the note. */
export function TimelineList({ ticket }: { ticket: Ticket }) {
  return (
    <ul className="space-y-3">
      {[...ticket.timeline].reverse().map((e, i) => (
        <li key={i} className="flex gap-3 text-sm">
          <span className="mt-0.5 text-base" aria-hidden>
            {ROLE_ICON[e.by.role] ?? "•"}
          </span>
          <div className="min-w-0">
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {STATUS_LABEL[e.status]} <span className="font-normal text-slate-500 dark:text-slate-400">· {fmt(e.at)}</span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">by {e.by.name}</p>
            {e.note && <p className="mt-0.5 break-words text-slate-700 dark:text-slate-300">{e.note}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
