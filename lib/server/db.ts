// File-backed ticket store. Runs only on the server (route handlers).
// Tickets live in data/tickets.json, photos in data/photos/<id>[-officer].<ext>.
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  STATUSES,
  type Actor,
  type Role,
  type Status,
  type Ticket,
  type TimelineEntry,
  type TriageResult,
  type VerifyOutcome,
  type VoiceNote,
} from "../types";
import { findDuplicate, nextId } from "../tickets";
import { ACTION_RULES, PERSONAS, distanceMeters, type Action } from "../workflow";
import { matchPhotos, type Photo } from "./triage";
import { buildSamples } from "./samples";

const DATA_DIR =
  process.env.DATA_DIR || (process.env.VERCEL ? "/tmp/civiclens" : path.join(process.cwd(), "data"));
const TICKETS_FILE = path.join(DATA_DIR, "tickets.json");
const PHOTO_DIR = path.join(DATA_DIR, "photos");
const AUDIO_DIR = path.join(DATA_DIR, "audio");

const MIME_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const EXT_MIME: Record<string, string> = Object.fromEntries(Object.entries(MIME_EXT).map(([m, e]) => [e, m]));
const PHOTO_ID = /^(CL|DEMO)-\d+(-officer)?$/;

const SYSTEM: Actor = { role: "system", name: "CivicLens" };
const FIELD_OFFICER = PERSONAS.field_officer.name;
const actorFor = (role: Role): Actor => ({ role, name: PERSONAS[role].name });

// Serialise all writes so two phones submitting at once can't clobber each other.
// Kept on globalThis so every route bundle (and dev hot reloads) share one queue.
const g = globalThis as unknown as { __civicQueue?: Promise<unknown> };
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = (g.__civicQueue ?? Promise.resolve()).then(fn, fn);
  g.__civicQueue = run.catch(() => {});
  return run;
}

/** Upgrades tickets saved by older versions (Open/In Progress/Resolved, no timeline). */
function normalize(raw: Ticket & { status: string }): Ticket {
  const status: Status = (STATUSES as readonly string[]).includes(raw.status) ? (raw.status as Status) : "Assigned";
  const timeline: TimelineEntry[] = raw.timeline ?? [
    { status: "Submitted", by: { role: "citizen", name: raw.citizenName ?? "Citizen" }, at: raw.createdAt, note: "Complaint submitted." },
    { status: "Assigned", by: SYSTEM, at: raw.createdAt, note: `Auto-assigned to ${FIELD_OFFICER}.` },
    ...(status !== "Assigned" ? [{ status, by: SYSTEM, at: raw.createdAt, note: "Migrated from an earlier version." }] : []),
  ];
  return {
    ...raw,
    status,
    timeline,
    lat: raw.lat ?? null,
    lng: raw.lng ?? null,
    citizenName: raw.citizenName ?? "Citizen",
    assignedTo: raw.assignedTo ?? FIELD_OFFICER,
    verification: raw.verification ?? null,
  };
}

async function readAll(): Promise<Ticket[]> {
  try {
    return (JSON.parse(await fs.readFile(TICKETS_FILE, "utf8")) as Ticket[]).map(normalize);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(tickets: Ticket[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${TICKETS_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(tickets, null, 2));
  await fs.rename(tmp, TICKETS_FILE); // atomic replace: never a half-written file
}

export function listTickets(): Promise<Ticket[]> {
  return readAll();
}

/** Parses "data:image/jpeg;base64,..." into bytes. Returns null if it isn't a supported image. */
export function decodePhoto(dataUrl: string): Photo | null {
  const m = dataUrl.match(/^data:(image\/[\w.+-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!m || !MIME_EXT[m[1]]) return null;
  return { mime: m[1], bytes: Buffer.from(m[2], "base64") };
}

// Browser recorders: Chrome/Android → webm, Firefox → ogg, Safari/iOS → mp4. Gemini accepts all of these.
const AUDIO_EXT: Record<string, string> = { "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/aac": "aac", "audio/mpeg": "mp3", "audio/wav": "wav" };
const AUDIO_EXT_MIME: Record<string, string> = Object.fromEntries(Object.entries(AUDIO_EXT).map(([m, e]) => [e, m]));

/** Parses "data:audio/webm;codecs=opus;base64,..." into bytes (codec parameters are dropped). */
export function decodeAudio(dataUrl: string): Photo | null {
  const m = dataUrl.match(/^data:(audio\/[\w.+-]+)(?:;[^,;]+=[^,;]+)*;base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return null;
  const mime = m[1] === "audio/x-m4a" ? "audio/mp4" : m[1];
  if (!AUDIO_EXT[mime]) return null;
  return { mime, bytes: Buffer.from(m[2], "base64") };
}

export async function readAudio(id: string): Promise<Photo | null> {
  if (!/^CL-\d+$/.test(id)) return null;
  for (const [ext, mime] of Object.entries(AUDIO_EXT_MIME)) {
    try {
      return { mime, bytes: await fs.readFile(path.join(AUDIO_DIR, `${id}.${ext}`)) };
    } catch {
      // try next extension
    }
  }
  return null;
}

async function savePhoto(name: string, photo: Photo) {
  await fs.mkdir(PHOTO_DIR, { recursive: true });
  // Remove an older capture with a different extension so readPhoto can't serve a stale file.
  await Promise.all(Object.values(MIME_EXT).map((e) => fs.rm(path.join(PHOTO_DIR, `${name}.${e}`), { force: true })));
  await fs.writeFile(path.join(PHOTO_DIR, `${name}.${MIME_EXT[photo.mime]}`), photo.bytes);
}

export async function readPhoto(id: string): Promise<Photo | null> {
  if (!PHOTO_ID.test(id)) return null; // no path tricks
  for (const [ext, mime] of Object.entries(EXT_MIME)) {
    try {
      return { mime, bytes: await fs.readFile(path.join(PHOTO_DIR, `${id}.${ext}`)) };
    } catch {
      // try next extension
    }
  }
  return null;
}

export function createTicket(input: {
  text: string;
  area: string;
  lat: number | null;
  lng: number | null;
  triage: TriageResult;
  photo: Photo | null;
  voice: { audio: Photo; durationSec: number; language: string; englishTranslation: string } | null;
}): Promise<Ticket> {
  return locked(async () => {
    const all = await readAll();
    const id = nextId(all.filter((t) => !t.sample));
    let photoUrl: string | null = null;
    if (input.photo) {
      await savePhoto(id, input.photo);
      photoUrl = `/api/photos/${id}`;
    }
    let voice: VoiceNote | null = null;
    if (input.voice) {
      await fs.mkdir(AUDIO_DIR, { recursive: true });
      await fs.writeFile(path.join(AUDIO_DIR, `${id}.${AUDIO_EXT[input.voice.audio.mime]}`), input.voice.audio.bytes);
      voice = {
        audioUrl: `/api/audio/${id}`,
        durationSec: input.voice.durationSec,
        language: input.voice.language,
        englishTranslation: input.voice.englishTranslation,
      };
    }
    const dup = findDuplicate(all, input.triage.category, input.area);
    const now = new Date().toISOString();
    const citizen = actorFor("citizen");
    const ticket: Ticket = {
      id,
      createdAt: now,
      text: input.text,
      photoUrl,
      voice,
      area: input.area,
      lat: input.lat,
      lng: input.lng,
      citizenName: citizen.name,
      triage: input.triage,
      status: "Assigned",
      assignedTo: FIELD_OFFICER,
      duplicateOf: dup?.id ?? null,
      verification: null,
      timeline: [
        { status: "Submitted", by: citizen, at: now, note: `${voice ? `Voice complaint (${voice.language}, ${voice.durationSec}s). ` : ""}AI triage: ${input.triage.severity} · ${input.triage.category}.` },
        {
          status: "Assigned",
          by: SYSTEM,
          at: now,
          note: `Auto-assigned to ${FIELD_OFFICER} (${input.triage.department}).${dup ? ` Possible duplicate of #${dup.id}.` : ""}`,
        },
      ],
    };
    await writeAll([ticket, ...all]);
    return ticket;
  });
}

// ---------------------------------------------------------------- workflow actions

export interface ActionRequest {
  action: Action;
  role: Role;
  note?: string;
  outcome?: VerifyOutcome;
  photo?: Photo | null;
  lat?: number | null;
  lng?: number | null;
  accuracyM?: number | null;
}

export class ActionError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

function check(t: Ticket | undefined, req: ActionRequest): Ticket {
  if (!t) throw new ActionError("Ticket not found.", 404);
  const rule = ACTION_RULES[req.action];
  if (!rule) throw new ActionError("Unknown action.");
  if (rule.role !== req.role) throw new ActionError(`Only a ${PERSONAS[rule.role].label} can do this.`, 403);
  if (!rule.from.includes(t.status)) {
    throw new ActionError(`Not allowed while the ticket is "${t.status}". Required: ${rule.from.join(" or ")}.`, 409);
  }
  return t;
}

const NEED_NOTE = new Set(["verify", "approve", "send_back", "reject"]);

/** Applies a workflow action. Validates role and current status on the server. */
export async function applyAction(id: string, req: ActionRequest): Promise<Ticket> {
  const note = (req.note ?? "").trim().slice(0, 500);
  if (NEED_NOTE.has(req.action) && note.length < 3) throw new ActionError("Please write a short note / reason.");

  // Evidence capture calls the AI, so do the slow part outside the write lock.
  if (req.action === "capture_evidence") {
    const t = check((await readAll()).find((x) => x.id === id), req);
    if (!req.photo) throw new ActionError("An on-site photo is required.");
    const photoName = `${id}-officer`;
    await savePhoto(photoName, req.photo);
    const citizenPhoto = t.photoUrl?.startsWith("/api/photos/") ? await readPhoto(id) : null;
    const match = await matchPhotos({
      summary: t.triage.english_summary,
      category: t.triage.category,
      citizenPhoto,
      officerPhoto: req.photo,
    }).catch(() => null); // AI unavailable: officer can still verify; UI says so
    const lat = req.lat ?? null;
    const lng = req.lng ?? null;
    const now = new Date().toISOString();
    return locked(async () => {
      const all = await readAll();
      const cur = check(all.find((x) => x.id === id), req);
      cur.verification = {
        photoUrl: `/api/photos/${photoName}?v=${Date.now()}`,
        lat,
        lng,
        accuracyM: req.accuracyM ?? null,
        distanceM:
          lat != null && lng != null && cur.lat != null && cur.lng != null
            ? distanceMeters({ lat, lng }, { lat: cur.lat, lng: cur.lng })
            : null,
        match,
        capturedAt: now,
        capturedBy: PERSONAS.field_officer.name,
      };
      await writeAll(all);
      return cur;
    });
  }

  return locked(async () => {
    const all = await readAll();
    const t = check(all.find((x) => x.id === id), req);
    const by = actorFor(req.role);
    const at = new Date().toISOString();
    const push = (status: Status, text: string) => {
      t.status = status;
      t.timeline.push({ status, by, at, note: text });
    };

    switch (req.action) {
      case "assign":
        t.assignedTo = FIELD_OFFICER;
        push("Assigned", `Assigned to ${FIELD_OFFICER}.${note ? ` ${note}` : ""}`);
        break;
      case "verify": {
        if (!t.verification) throw new ActionError("Capture an on-site photo first.");
        const outcome = req.outcome;
        if (outcome !== "Confirmed" && outcome !== "Not found" && outcome !== "Duplicate") {
          throw new ActionError("Choose Confirmed, Not found or Duplicate.");
        }
        t.verification = { ...t.verification, outcome, note, verifiedAt: at };
        if (outcome === "Confirmed") push("Field Verified", `Confirmed on site. ${note}`);
        else push("Rejected", `Rejected as ${outcome === "Duplicate" ? "Duplicate" : "Invalid (not found on site)"}. ${note}`);
        break;
      }
      case "approve":
        push("Approved", `Approved & work crew dispatched. ${note}`);
        break;
      case "send_back":
        t.verification = null; // officer must capture fresh evidence
        push("Assigned", `Sent back for re-verification. ${note}`);
        break;
      case "reject":
        push("Rejected", `Rejected by authority. ${note}`);
        break;
      case "start_work":
        push("In Progress", note || "Work crew started on site.");
        break;
      case "resolve":
        push("Resolved", note || "Work completed.");
        break;
      default:
        throw new ActionError("Unknown action.");
    }
    await writeAll(all);
    return t;
  });
}

// ---------------------------------------------------------------- demo samples

/** Adds (or refreshes) sample tickets at every workflow stage. Real tickets are untouched. */
export function loadSamples(): Promise<number> {
  return locked(async () => {
    const real = (await readAll()).filter((t) => !t.sample);
    const samples = buildSamples();
    await writeAll([...real, ...samples]);
    return samples.length;
  });
}

export function removeSamples(): Promise<number> {
  return locked(async () => {
    const all = await readAll();
    const real = all.filter((t) => !t.sample);
    await writeAll(real);
    return all.length - real.length;
  });
}
