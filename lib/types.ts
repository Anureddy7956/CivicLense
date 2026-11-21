export const CATEGORIES = ["roads", "waste", "water", "electricity", "trees", "drainage", "other"] as const;
export type Category = (typeof CATEGORIES)[number];

export const SEVERITIES = ["Low", "Medium", "High", "Critical"] as const;
export type Severity = (typeof SEVERITIES)[number];

/** Ticket lifecycle. "Rejected" can happen at field verification or at authority review. */
export const STATUSES = ["Submitted", "Assigned", "Field Verified", "Rejected", "Approved", "In Progress", "Resolved"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  Submitted: "Submitted",
  Assigned: "Assigned to Field Officer",
  "Field Verified": "Field Verified",
  Rejected: "Rejected",
  Approved: "Approved by Authority",
  "In Progress": "Work In Progress",
  Resolved: "Resolved",
};

export const ROLES = ["citizen", "field_officer", "authority"] as const;
export type Role = (typeof ROLES)[number];

export interface Actor {
  role: Role | "system";
  name: string;
}

export interface TimelineEntry {
  status: Status;
  by: Actor;
  at: string; // ISO
  note: string;
}

/** Exact JSON the AI returns for triage (department is normalised server-side). */
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

/** AI comparison of the citizen's report vs the officer's on-site photo. */
export interface MatchCheck {
  same_issue: boolean;
  confidence: number; // 0..1
  reason: string;
}

export type VerifyOutcome = "Confirmed" | "Not found" | "Duplicate";

export interface Verification {
  photoUrl: string;
  lat: number | null;
  lng: number | null;
  accuracyM: number | null;
  distanceM: number | null; // officer GPS ↔ complaint GPS
  match: MatchCheck | null; // null = AI check unavailable
  capturedAt: string;
  capturedBy: string;
  outcome?: VerifyOutcome;
  note?: string;
  verifiedAt?: string;
}

export interface Ticket {
  id: string; // "CL-1009"
  createdAt: string;
  text: string;
  photoUrl: string | null;
  area: string;
  lat: number | null;
  lng: number | null;
  citizenName: string;
  triage: TriageResult;
  status: Status;
  assignedTo: string | null;
  duplicateOf: string | null;
  verification: Verification | null;
  timeline: TimelineEntry[];
  sample?: boolean;
}
