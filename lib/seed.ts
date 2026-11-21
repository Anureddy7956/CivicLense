import type { Category, Severity, Status, Ticket } from "./types";
import { DEPARTMENTS } from "./departments";

type Row = {
  text: string;
  area: string;
  category: Category;
  severity: Severity;
  reason: string;
  lang: string;
  summary: string;
  title: string;
  hoursAgo: number;
  status?: Status;
  duplicateOf?: string;
};

const ROWS: Row[] = [
  {
    text: "A live electric wire has snapped and is lying on the footpath near Jayanagar 4th Block bus stop. Children cross here to go to school.",
    area: "Jayanagar 4th Block",
    category: "electricity",
    severity: "Critical",
    reason: "Live wire on a busy footpath used by schoolchildren risks electrocution.",
    lang: "English",
    summary: "A snapped live electric wire is lying on the footpath near Jayanagar 4th Block bus stop.",
    title: "Live wire on footpath near bus stop",
    hoursAgo: 1,
  },
  {
    text: "ಕೋರಮಂಗಲ 5ನೇ ಬ್ಲಾಕ್ ಮುಖ್ಯ ರಸ್ತೆಯಲ್ಲಿ ದೊಡ್ಡ ಗುಂಡಿ ಇದೆ. ಎರಡು ವಾರದಿಂದ ಬೈಕ್ ಸವಾರರು ಬೀಳುತ್ತಿದ್ದಾರೆ.",
    area: "Koramangala 5th Block",
    category: "roads",
    severity: "High",
    reason: "Large pothole on a main road has caused repeated two-wheeler falls.",
    lang: "Kannada",
    summary: "A large pothole on Koramangala 5th Block main road has been making bikers fall for two weeks.",
    title: "Large pothole causing bike accidents",
    hoursAgo: 5,
  },
  {
    text: "हमारी गली में तीन दिन से पानी नहीं आ रहा है। बुज़ुर्ग लोग बहुत परेशान हैं।",
    area: "BTM Layout 2nd Stage",
    category: "water",
    severity: "High",
    reason: "No water supply for three days affects an entire street, including elderly residents.",
    lang: "Hindi",
    summary: "The street has had no water supply for three days and elderly residents are struggling.",
    title: "No water supply for 3 days",
    hoursAgo: 9,
    status: "In Progress",
  },
  {
    text: "Manhole cover missing on 100 Feet Road, Indiranagar, right next to the signal. Very dangerous at night.",
    area: "Indiranagar",
    category: "drainage",
    severity: "Critical",
    reason: "Open manhole on a main road can cause fatal falls, especially at night.",
    lang: "English",
    summary: "A manhole on 100 Feet Road, Indiranagar is uncovered next to the traffic signal.",
    title: "Open manhole on 100 Feet Road",
    hoursAgo: 14,
  },
  {
    text: "Garbage has not been collected for 5 days outside the government school on 8th Cross. It smells terrible.",
    area: "Malleshwaram",
    category: "waste",
    severity: "Medium",
    reason: "Uncollected garbage near a school is a growing health nuisance.",
    lang: "English",
    summary: "Garbage outside the government school on 8th Cross has not been collected for five days.",
    title: "Garbage piling up outside school",
    hoursAgo: 20,
  },
  {
    text: "Same garbage heap on 8th cross is still there, now dogs are spreading it on the road.",
    area: "Malleshwaram",
    category: "waste",
    severity: "Medium",
    reason: "Garbage heap is spreading onto the road; needs clearance within days.",
    lang: "English",
    summary: "The garbage heap on 8th Cross remains and stray dogs are spreading it onto the road.",
    title: "Garbage heap spreading onto road",
    hoursAgo: 3,
    duplicateOf: "CL-1005",
  },
  {
    text: "Big branch of a rain tree is cracked and hanging over the road after last night's storm.",
    area: "Basavanagudi",
    category: "trees",
    severity: "High",
    reason: "Cracked branch hanging over the road may fall on vehicles or pedestrians.",
    lang: "English",
    summary: "A cracked rain-tree branch is hanging over the road in Basavanagudi after the storm.",
    title: "Cracked branch hanging over road",
    hoursAgo: 11,
  },
  {
    text: "Lane markings near Ulsoor lake signal have faded completely.",
    area: "Ulsoor",
    category: "roads",
    severity: "Low",
    reason: "Faded lane markings are a minor, cosmetic issue.",
    lang: "English",
    summary: "Lane markings near the Ulsoor lake signal have faded.",
    title: "Faded lane markings",
    hoursAgo: 48,
    status: "Resolved",
  },
];

export function seedTickets(): Ticket[] {
  const now = Date.now();
  return ROWS.map((r, i) => ({
    id: `CL-${1001 + i}`,
    createdAt: new Date(now - r.hoursAgo * 36e5).toISOString(),
    text: r.text,
    photo: null,
    area: r.area,
    status: r.status ?? "Open",
    duplicateOf: r.duplicateOf ?? null,
    triage: {
      category: r.category,
      severity: r.severity,
      severity_reason: r.reason,
      department: DEPARTMENTS[r.category].label,
      detected_language: r.lang,
      english_summary: r.summary,
      title: r.title,
      photo_observation: null,
      is_valid_complaint: true,
    },
  }));
}
