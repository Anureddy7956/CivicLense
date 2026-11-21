// Demo tickets at every workflow stage. Loaded only on request (Dashboard → "Load sample tickets"),
// marked `sample: true`, and removable without touching real complaints.
import type { Actor, Category, MatchCheck, Severity, Status, Ticket, TimelineEntry } from "../types";
import { DEPARTMENTS } from "../departments";
import { PERSONAS, distanceMeters } from "../workflow";

const citizen: Actor = { role: "citizen", name: "Sample citizen" };
const system: Actor = { role: "system", name: "CivicLens" };
const officer: Actor = { role: "field_officer", name: PERSONAS.field_officer.name };
const authority: Actor = { role: "authority", name: PERSONAS.authority.name };

interface Spec {
  status: Status;
  hoursAgo: number;
  text: string;
  area: string;
  lat: number;
  lng: number;
  category: Category;
  severity: Severity;
  reason: string;
  lang: string;
  summary: string;
  title: string;
  photo?: string;
  duplicateOf?: string;
  verify?: { photo: string; dLat: number; dLng: number; match: MatchCheck; outcome: "Confirmed" | "Not found" | "Duplicate"; note: string };
  /** Extra steps after verification: [status, actor, note, hoursAfterCreation] */
  after?: [Status, Actor, string, number][];
}

const SPECS: Spec[] = [
  {
    status: "Submitted",
    hoursAgo: 0.2,
    text: "Electric pole is leaning badly towards the road after a lorry hit it. Wires are stretched tight.",
    area: "Jayanagar 4th Block",
    lat: 12.925,
    lng: 77.5838,
    category: "electricity",
    severity: "Critical",
    reason: "Leaning pole with stretched live wires can fall onto traffic and pedestrians.",
    lang: "English",
    summary: "An electric pole hit by a lorry is leaning towards the road with tightly stretched wires.",
    title: "Leaning electric pole after lorry hit",
  },
  {
    status: "Assigned",
    hoursAgo: 2,
    text: "Manhole cover missing on 100 Feet Road right next to the signal. Very dangerous at night.",
    area: "Indiranagar 100 Feet Road",
    lat: 12.9719,
    lng: 77.6412,
    category: "drainage",
    severity: "Critical",
    reason: "Open manhole on a main road can cause fatal falls, especially at night.",
    lang: "English",
    summary: "A manhole on 100 Feet Road, Indiranagar is uncovered next to the traffic signal.",
    title: "Open manhole on 100 Feet Road",
    photo: "/samples/manhole.svg",
  },
  {
    status: "Assigned",
    hoursAgo: 6,
    text: "ಕೋರಮಂಗಲ 5ನೇ ಬ್ಲಾಕ್ ಮುಖ್ಯ ರಸ್ತೆಯಲ್ಲಿ ದೊಡ್ಡ ಗುಂಡಿ ಇದೆ. ಎರಡು ವಾರದಿಂದ ಬೈಕ್ ಸವಾರರು ಬೀಳುತ್ತಿದ್ದಾರೆ.",
    area: "Koramangala 5th Block",
    lat: 12.9348,
    lng: 77.6189,
    category: "roads",
    severity: "High",
    reason: "Large pothole on a main road has caused repeated two-wheeler falls.",
    lang: "Kannada",
    summary: "A large pothole on Koramangala 5th Block main road has been making bikers fall for two weeks.",
    title: "Large pothole causing bike accidents",
    photo: "/samples/pothole.svg",
  },
  {
    status: "Field Verified",
    hoursAgo: 10,
    text: "Big branch of a rain tree is cracked and hanging over the road after last night's storm.",
    area: "Basavanagudi",
    lat: 12.9422,
    lng: 77.5755,
    category: "trees",
    severity: "High",
    reason: "Cracked branch hanging over the road may fall on vehicles or pedestrians.",
    lang: "English",
    summary: "A cracked rain-tree branch is hanging over the road in Basavanagudi after the storm.",
    title: "Cracked branch hanging over road",
    photo: "/samples/branch.svg",
    verify: {
      photo: "/samples/branch-site.svg",
      dLat: 0.0002,
      dLng: 0.0002,
      match: { same_issue: true, confidence: 0.92, reason: "Both photos show the same cracked branch hanging over a road lined with rain trees." },
      outcome: "Confirmed",
      note: "Branch is split at the base, about 4 m above the road. Needs a tree-cutting crew today.",
    },
  },
  {
    status: "Field Verified",
    hoursAgo: 20,
    text: "Garbage has not been collected for 5 days outside the government school on 8th Cross. It smells terrible.",
    area: "Malleshwaram 8th Cross",
    lat: 13.0035,
    lng: 77.57,
    category: "waste",
    severity: "Medium",
    reason: "Uncollected garbage near a school is a growing health nuisance.",
    lang: "English",
    summary: "Garbage outside the government school on 8th Cross has not been collected for five days.",
    title: "Garbage piling up outside school",
    photo: "/samples/garbage.svg",
    verify: {
      photo: "/samples/park.svg",
      dLat: 0.0055,
      dLng: 0.001,
      match: { same_issue: false, confidence: 0.28, reason: "Citizen photo shows a garbage heap by a wall; officer photo shows a clean park path." },
      outcome: "Confirmed",
      note: "Checked the area, marking as confirmed.",
    },
  },
  {
    status: "Approved",
    hoursAgo: 30,
    text: "हमारी गली में तीन दिन से पानी नहीं आ रहा है। मुख्य पाइप से पानी बह रहा है।",
    area: "BTM Layout 2nd Stage",
    lat: 12.9166,
    lng: 77.6101,
    category: "water",
    severity: "High",
    reason: "Burst main pipe has cut water supply to the whole street for three days.",
    lang: "Hindi",
    summary: "The street has had no water for three days because the main pipe is leaking.",
    title: "Burst main pipe, no water for 3 days",
    photo: "/samples/pipe.svg",
    verify: {
      photo: "/samples/pipe.svg",
      dLat: 0.0001,
      dLng: -0.0001,
      match: { same_issue: true, confidence: 0.95, reason: "Both photos show water gushing from the same broken pipe at the roadside." },
      outcome: "Confirmed",
      note: "Main line cracked at the joint. Valve closed temporarily.",
    },
    after: [["Approved", authority, "Approved & work crew dispatched. Pipe crew from BWSSB South sub-division.", 26]],
  },
  {
    status: "In Progress",
    hoursAgo: 40,
    text: "Drain overflowing and road waterlogged after rain, sewage smell everywhere.",
    area: "Bellandur Outer Ring Road",
    lat: 12.926,
    lng: 77.6762,
    category: "drainage",
    severity: "High",
    reason: "Waterlogging on a major road disrupts traffic and spreads sewage.",
    lang: "English",
    summary: "An overflowing drain has waterlogged the Outer Ring Road at Bellandur.",
    title: "Overflowing drain floods ORR",
    photo: "/samples/flood.svg",
    verify: {
      photo: "/samples/flood.svg",
      dLat: -0.0003,
      dLng: 0.0001,
      match: { same_issue: true, confidence: 0.88, reason: "Both photos show the same flooded stretch of road with an overflowing drain." },
      outcome: "Confirmed",
      note: "Silt blocking the culvert. Needs a jetting machine.",
    },
    after: [
      ["Approved", authority, "Approved & work crew dispatched. Jetting machine assigned.", 34],
      ["In Progress", officer, "Crew on site, desilting the culvert.", 37],
    ],
  },
  {
    status: "Resolved",
    hoursAgo: 72,
    text: "Lane markings near Ulsoor lake signal have faded completely.",
    area: "Ulsoor",
    lat: 12.9817,
    lng: 77.6205,
    category: "roads",
    severity: "Low",
    reason: "Faded lane markings are a minor, cosmetic issue.",
    lang: "English",
    summary: "Lane markings near the Ulsoor lake signal have faded.",
    title: "Faded lane markings",
    photo: "/samples/markings.svg",
    verify: {
      photo: "/samples/markings.svg",
      dLat: 0.0001,
      dLng: 0.0001,
      match: { same_issue: true, confidence: 0.9, reason: "Both photos show the same faded zebra crossing at the lake signal." },
      outcome: "Confirmed",
      note: "Markings faded on all four arms of the junction.",
    },
    after: [
      ["Approved", authority, "Approved & work crew dispatched. Add to this week's repainting list.", 50],
      ["In Progress", officer, "Repainting started.", 60],
      ["Resolved", officer, "Zebra crossing and lane markings repainted.", 66],
    ],
  },
  {
    status: "Rejected",
    hoursAgo: 4,
    text: "Same garbage heap on 8th cross is still there, dogs are spreading it on the road.",
    area: "Malleshwaram 8th Cross",
    lat: 13.0036,
    lng: 77.5702,
    category: "waste",
    severity: "Medium",
    reason: "Garbage heap is spreading onto the road; needs clearance within days.",
    lang: "English",
    summary: "The garbage heap on 8th Cross remains and stray dogs are spreading it onto the road.",
    title: "Garbage heap spreading onto road",
    duplicateOf: "DEMO-05",
    verify: {
      photo: "/samples/garbage.svg",
      dLat: 0.0001,
      dLng: 0,
      match: { same_issue: true, confidence: 0.81, reason: "Officer photo shows the same garbage heap described in the complaint." },
      outcome: "Duplicate",
      note: "Same heap as #DEMO-05. Tracking it there.",
    },
  },
];

export function buildSamples(): Ticket[] {
  const now = Date.now();
  return SPECS.map((s, i) => {
    const id = `DEMO-${String(i + 1).padStart(2, "0")}`;
    const created = now - s.hoursAgo * 36e5;
    const at = (h: number) => new Date(Math.min(created + h * 36e5, now)).toISOString();
    const timeline: TimelineEntry[] = [
      { status: "Submitted", by: citizen, at: at(0), note: `AI triage: ${s.severity} · ${s.category}.` },
    ];
    if (s.status !== "Submitted") {
      timeline.push({ status: "Assigned", by: system, at: at(0), note: `Auto-assigned to ${officer.name} (${DEPARTMENTS[s.category].label}).` });
    }
    let verification: Ticket["verification"] = null;
    if (s.verify) {
      const v = s.verify;
      const lat = s.lat + v.dLat;
      const lng = s.lng + v.dLng;
      const vAt = at(Math.min(3, s.hoursAgo * 0.4));
      verification = {
        photoUrl: v.photo,
        lat,
        lng,
        accuracyM: 12,
        distanceM: distanceMeters({ lat, lng }, { lat: s.lat, lng: s.lng }),
        match: v.match,
        capturedAt: vAt,
        capturedBy: officer.name,
        outcome: v.outcome,
        note: v.note,
        verifiedAt: vAt,
      };
      timeline.push(
        v.outcome === "Confirmed"
          ? { status: "Field Verified", by: officer, at: vAt, note: `Confirmed on site. ${v.note}` }
          : { status: "Rejected", by: officer, at: vAt, note: `Rejected as ${v.outcome === "Duplicate" ? "Duplicate" : "Invalid (not found on site)"}. ${v.note}` },
      );
    }
    for (const [status, by, note, h] of s.after ?? []) timeline.push({ status, by, at: at(h), note });

    return {
      id,
      createdAt: at(0),
      text: s.text,
      photoUrl: s.photo ?? null,
      area: s.area,
      lat: s.lat,
      lng: s.lng,
      citizenName: citizen.name,
      status: s.status,
      assignedTo: s.status === "Submitted" ? null : officer.name,
      duplicateOf: s.duplicateOf ?? null,
      verification,
      timeline,
      sample: true,
      triage: {
        category: s.category,
        severity: s.severity,
        severity_reason: s.reason,
        department: DEPARTMENTS[s.category].label,
        detected_language: s.lang,
        english_summary: s.summary,
        title: s.title,
        photo_observation: null,
        is_valid_complaint: true,
      },
    };
  });
}
