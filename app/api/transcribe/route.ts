import { decodeAudio } from "@/lib/server/db";
import { TriageError, transcribeAudio } from "@/lib/server/triage";

export const maxDuration = 30;

const LANGUAGES: Record<string, string> = {
  "en-IN": "English",
  "kn-IN": "Kannada",
  "hi-IN": "Hindi",
  "ta-IN": "Tamil",
  "te-IN": "Telugu",
  "ml-IN": "Malayalam",
  "mr-IN": "Marathi",
};

/** Voice complaint → { transcript_original, language, english_translation }. Body: { audio: dataURL, language: "kn-IN" } */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { audio?: unknown; language?: unknown } | null;
  if (!body || typeof body.audio !== "string" || !body.audio) {
    return Response.json({ error: "No recording received. Please try again." }, { status: 400 });
  }
  if (body.audio.length > 2_000_000) {
    return Response.json({ error: "Recording is too long. Please keep it under 60 seconds." }, { status: 413 });
  }
  const audio = decodeAudio(body.audio);
  if (!audio) return Response.json({ error: "This browser recorded an audio format we can't read." }, { status: 415 });
  const hint = LANGUAGES[typeof body.language === "string" ? body.language : ""] ?? "English";

  try {
    const t = await transcribeAudio(audio, hint);
    if (!t.transcript_original) {
      return Response.json(
        { error: "We couldn't hear any words. Hold the phone closer and speak clearly, or type instead.", ...t },
        { status: 422 },
      );
    }
    return Response.json(t);
  } catch (err) {
    if (err instanceof TriageError) {
      return Response.json({ error: "Couldn't transcribe right now. Please try again or type your complaint." }, { status: err.status });
    }
    console.error("[transcribe] failed:", err);
    return Response.json({ error: "Couldn't transcribe right now. Please try again." }, { status: 500 });
  }
}
