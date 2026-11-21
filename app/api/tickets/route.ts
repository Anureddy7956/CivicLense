import { connection } from "next/server";
import { createTicket, decodeAudio, decodePhoto, listTickets } from "@/lib/server/db";
import { TriageError, triageComplaint } from "@/lib/server/triage";
import { parseLatLng, sortTickets } from "@/lib/tickets";

export const maxDuration = 30; // seconds: room for one AI attempt + one retry

/** All tickets, severity-sorted. Always fresh (never cached). */
export async function GET() {
  await connection();
  const tickets = await listTickets();
  return Response.json({ tickets: sortTickets(tickets) }, { headers: { "Cache-Control": "no-store" } });
}

/** Citizen submits a complaint → AI triage → saved ticket. */
export async function POST(request: Request) {
  let body: {
    text?: unknown;
    area?: unknown;
    photo?: unknown;
    lat?: unknown;
    lng?: unknown;
    audio?: unknown;
    audioDurationSec?: unknown;
    voiceLanguage?: unknown;
    voiceTranslation?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim().slice(0, 3000) : "";
  const area = typeof body.area === "string" ? body.area.trim().slice(0, 120) : "";
  const photoStr = typeof body.photo === "string" && body.photo ? body.photo : null;
  const { lat, lng } = parseLatLng(body.lat, body.lng);

  if (!text && !photoStr) {
    return Response.json({ error: "Please describe the problem or attach a photo." }, { status: 400 });
  }
  if (photoStr && photoStr.length > 1_500_000) {
    return Response.json({ error: "Photo is too large. Please use a smaller image." }, { status: 413 });
  }
  const photo = photoStr ? decodePhoto(photoStr) : null;
  if (photoStr && !photo) {
    return Response.json({ error: "Unsupported photo format. Please use JPG, PNG or WebP." }, { status: 415 });
  }

  let voice = null;
  if (typeof body.audio === "string" && body.audio) {
    if (body.audio.length > 2_000_000) return Response.json({ error: "Voice clip is too long. Keep it under 60 seconds." }, { status: 413 });
    const audio = decodeAudio(body.audio);
    if (!audio) return Response.json({ error: "Unsupported audio format." }, { status: 415 });
    const dur = Number(body.audioDurationSec);
    voice = {
      audio,
      durationSec: Number.isFinite(dur) ? Math.max(1, Math.min(60, Math.round(dur))) : 0,
      language: typeof body.voiceLanguage === "string" ? body.voiceLanguage.slice(0, 40) : "Unknown",
      englishTranslation: typeof body.voiceTranslation === "string" ? body.voiceTranslation.slice(0, 3000) : "",
    };
  }

  try {
    const triage = await triageComplaint(text, photo);
    if (!triage.is_valid_complaint) {
      return Response.json(
        { error: "This doesn't look like a civic complaint.", triage },
        { status: 422 },
      );
    }
    const ticket = await createTicket({ text, area, lat, lng, triage, photo, voice });
    return Response.json({ ticket }, { status: 201 });
  } catch (err) {
    if (err instanceof TriageError) return Response.json({ error: err.message }, { status: err.status });
    console.error("[tickets] save failed:", err);
    return Response.json({ error: "Couldn't save your complaint. Please try again." }, { status: 500 });
  }
}
