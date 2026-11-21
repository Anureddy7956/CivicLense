export const CATEGORIES = ["roads", "waste", "water", "electricity", "trees", "drainage", "other"] as const;
export type Category = (typeof CATEGORIES)[number];

export const SEVERITIES = ["Low", "Medium", "High", "Critical"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const STATUSES = ["Open", "In Progress", "Resolved"] as const;
export type Status = (typeof STATUSES)[number];

/** Exact JSON the AI returns (department is normalised server-side to the official mapping). */
export interface TriageResult {
  category: Category;
  severity: Severity;
  severity_reason: string;
  department: string;
  detected_language: string;
  english_summary: string;
  title: string;
  photo_observation: string | null;
  is_valid_complaint: boolean;
}

export interface Ticket {
  id: string; // "CL-1009"
  createdAt: string; // ISO
  text: string; // original complaint, any language
  photo: string | null; // compressed JPEG data URL
  area: string; // "" when not given
  triage: TriageResult;
  status: Status;
  duplicateOf: string | null; // ticket id
}
