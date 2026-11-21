import type { Category, Severity } from "./types";

export interface Department {
  agency: "BBMP" | "BWSSB" | "BESCOM";
  label: string;
}

/** Official Bengaluru routing. The server overwrites the AI's department with this, so routing is always consistent. */
export const DEPARTMENTS: Record<Category, Department> = {
  roads: { agency: "BBMP", label: "BBMP – Road Infrastructure" },
  waste: { agency: "BBMP", label: "BBMP – Solid Waste Management" },
  trees: { agency: "BBMP", label: "BBMP – Forest Cell (Trees)" },
  water: { agency: "BWSSB", label: "BWSSB – Water Supply" },
  drainage: { agency: "BWSSB", label: "BWSSB – Sewerage & Drainage" },
  electricity: { agency: "BESCOM", label: "BESCOM – Electricity & Streetlights" },
  other: { agency: "BBMP", label: "BBMP – General Grievances" },
};

export const DEPARTMENT_LABELS = Array.from(new Set(Object.values(DEPARTMENTS).map((d) => d.label)));

export const SEVERITY_RANK: Record<Severity, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

export const SEVERITY_STYLE: Record<Severity, string> = {
  Critical: "bg-red-600 text-white ring-red-600",
  High: "bg-orange-500 text-white ring-orange-500",
  Medium: "bg-yellow-400 text-yellow-950 ring-yellow-400",
  Low: "bg-green-600 text-white ring-green-600",
};

export const SEVERITY_BORDER: Record<Severity, string> = {
  Critical: "border-l-red-600",
  High: "border-l-orange-500",
  Medium: "border-l-yellow-400",
  Low: "border-l-green-600",
};

export const CATEGORY_ICON: Record<Category, string> = {
  roads: "🛣️",
  waste: "🗑️",
  water: "🚰",
  electricity: "⚡",
  trees: "🌳",
  drainage: "🌊",
  other: "📋",
};
