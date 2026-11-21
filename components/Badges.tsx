import { CATEGORY_ICON, SEVERITY_STYLE } from "@/lib/departments";
import { STATUS_LABEL, type Category, type Severity, type Status } from "@/lib/types";

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${SEVERITY_STYLE[severity]}`}>
      {severity === "Critical" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />}
      {severity}
    </span>
  );
}

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-medium capitalize text-navy-700 dark:bg-navy-800 dark:text-navy-100">
      <span aria-hidden>{CATEGORY_ICON[category]}</span> {category}
    </span>
  );
}

export const STATUS_STYLE: Record<Status, string> = {
  Submitted: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
  Assigned: "bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200",
  "Field Verified": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200",
  Rejected: "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200",
  Approved: "bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200",
  "In Progress": "bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-200",
  Resolved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>
  );
}

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
