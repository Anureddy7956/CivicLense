import { CATEGORY_ICON, SEVERITY_STYLE } from "@/lib/departments";
import type { Category, Severity, Status } from "@/lib/types";

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
    <span className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-medium capitalize text-navy-700">
      <span aria-hidden>{CATEGORY_ICON[category]}</span> {category}
    </span>
  );
}

const STATUS_STYLE: Record<Status, string> = {
  Open: "bg-sky-100 text-sky-800",
  "In Progress": "bg-violet-100 text-violet-800",
  Resolved: "bg-emerald-100 text-emerald-800",
};

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>{status}</span>;
}

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
