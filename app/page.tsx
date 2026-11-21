"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { compressImage, getLocation, submitComplaint, type Fix } from "@/lib/store";
import type { Ticket, TriageResult } from "@/lib/types";
import TicketCard from "@/components/TicketCard";
import { Spinner } from "@/components/Badges";
import { StatusStepper } from "@/components/Timeline";
import RoleGate from "@/components/RoleGate";
import VoiceInput, { type VoiceResult } from "@/components/VoiceInput";

const SAMPLES = [
  { label: "⚡ Fallen wire", text: "Electric wire fell on the road near Jayanagar 4th Block metro after the rain. Sparks are coming. Please send someone fast!", area: "Jayanagar 4th Block" },
  { label: "🛣️ ಕನ್ನಡ – ರಸ್ತೆ ಗುಂಡಿ", text: "ಎಚ್‌ಎಸ್‌ಆರ್ ಲೇಔಟ್ ಸೆಕ್ಟರ್ 2ರಲ್ಲಿ ರಸ್ತೆ ಮಧ್ಯೆ ದೊಡ್ಡ ಗುಂಡಿ ಇದೆ, ರಾತ್ರಿ ಕಾಣಿಸುವುದಿಲ್ಲ.", area: "HSR Layout Sector 2" },
  { label: "🚰 हिंदी – पानी", text: "व्हाइटफील्ड में मुख्य पाइपलाइन फट गई है, सड़क पर पानी बह रहा है और घरों में पानी नहीं आ रहा।", area: "Whitefield" },
  { label: "🗑️ Garbage", text: "Garbage dumped next to the park on 8th Cross for a week now. Smells and attracts stray dogs.", area: "Malleshwaram" },
];

type Phase = { kind: "form" } | { kind: "done"; ticket: Ticket } | { kind: "invalid"; triage: TriageResult };

export default function ReportPage() {
  return (
    <RoleGate role="citizen">
      <ReportForm />
    </RoleGate>
  );
}

function ReportForm() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [area, setArea] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  const [fix, setFix] = useState<Fix | null>(null);
  const [voice, setVoice] = useState<VoiceResult | null>(null);

  function onVoice(r: VoiceResult) {
    setVoice(r);
    setText((prev) => (prev.trim() ? `${prev.trim()} ${r.transcript}` : r.transcript));
    setError(null);
  }
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  async function addLocation() {
    setLocating(true);
    setLocError(null);
    try {
      setFix(await getLocation());
    } catch (err) {
      setLocError(err instanceof Error ? err.message : "Couldn't get your location.");
    } finally {
      setLocating(false);
    }
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setError(null);
    setPhotoBusy(true);
    try {
      setPhoto(await compressImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that photo.");
      clearPhoto();
    } finally {
      setPhotoBusy(false);
    }
  }

  function clearPhoto() {
    setPhoto(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function reset() {
    setText("");
    setArea("");
    clearPhoto();
    setFix(null);
    setVoice(null);
    setError(null);
    setPhase({ kind: "form" });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() && !photo) {
      setError("Please describe the problem or add a photo so we know what to fix.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await submitComplaint({
      text: text.trim(),
      area: area.trim(),
      photo,
      lat: fix?.lat ?? null,
      lng: fix?.lng ?? null,
      audio: voice?.audio ?? null,
      audioDurationSec: voice?.durationSec,
      voiceLanguage: voice?.language,
      voiceTranslation: voice?.englishTranslation,
    });
    setLoading(false);
    if (result.ok) {
      setPhase({ kind: "done", ticket: result.ticket });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (result.triage && !result.triage.is_valid_complaint) {
      setPhase({ kind: "invalid", triage: result.triage });
    } else {
      setError(result.error);
    }
  }

  if (phase.kind === "done") {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">✓</span>
          <div>
            <p className="font-semibold">Complaint registered as #{phase.ticket.id}</p>
            <p className="text-sm">Sent to {phase.ticket.triage.department}. Keep this ticket ID for follow-up.</p>
          </div>
        </div>
        <TicketCard ticket={phase.ticket} />
        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold text-navy-900 dark:text-white">Where your complaint is</h2>
          <StatusStepper ticket={phase.ticket} />
        </section>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button onClick={reset} className="rounded-lg border border-navy-200 bg-white px-5 py-3 font-medium text-navy-800 hover:bg-navy-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
            Report another issue
          </button>
          <Link href="/my" className="rounded-lg bg-navy-900 px-5 py-3 text-center font-medium text-white hover:bg-navy-800 dark:bg-navy-500 dark:hover:bg-navy-400">
            Track in My Complaints →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <section className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl dark:text-white">Report a civic issue</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Write in <b>English, ಕನ್ನಡ, हिन्दी</b> or any language. Our AI reads it, rates how urgent it is and sends it to the right department:
          BBMP, BWSSB or BESCOM.
        </p>
      </section>

      {phase.kind === "invalid" && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
          <p className="font-semibold">This doesn’t look like a civic complaint.</p>
          <p className="mt-1">
            {phase.triage.english_summary} Please describe a problem in your area, like a pothole, garbage, water, power, trees or drainage.
          </p>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Try an example:</span>
        {SAMPLES.map((s) => (
          <button
            key={s.label}
            type="button"
            disabled={loading}
            onClick={() => {
              setText(s.text);
              setArea(s.area);
              setPhase({ kind: "form" });
            }}
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs hover:border-navy-500 hover:text-navy-700 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-navy-400 dark:hover:text-navy-200"
          >
            {s.label}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="relative space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <label htmlFor="text" className="block text-sm font-semibold text-navy-900 dark:text-slate-100">
            What’s the problem?
          </label>
          <div className="mt-1.5 mb-2">
            <VoiceInput onResult={onVoice} disabled={loading} />
          </div>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            maxLength={3000}
            placeholder="e.g. Big pothole outside Indiranagar metro station, two-wheelers are skidding…"
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-100 sm:text-sm dark:border-slate-700 dark:bg-slate-950 dark:placeholder:text-slate-500 dark:focus:ring-navy-700"
          />
          {voice?.englishTranslation && (
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              <span className="font-medium">English:</span> {voice.englishTranslation}
            </p>
          )}
          {voice && (
            <div className="mt-2 flex items-center gap-2">
              <audio controls src={voice.audio} className="h-10 min-w-0 flex-1" aria-label="Your voice recording" />
              <button type="button" onClick={() => setVoice(null)} className="shrink-0 px-2 py-2 text-xs font-medium text-red-600 hover:underline dark:text-red-400">
                Remove clip
              </button>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="area" className="block text-sm font-semibold text-navy-900 dark:text-slate-100">
            Location / area <span className="font-normal text-slate-400 dark:text-slate-500">(optional)</span>
          </label>
          <input
            id="area"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="e.g. Koramangala 5th Block, near Forum Mall"
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-100 sm:text-sm dark:border-slate-700 dark:bg-slate-950 dark:placeholder:text-slate-500 dark:focus:ring-navy-700"
          />
        </div>

        <div>
          <span className="block text-sm font-semibold text-navy-900 dark:text-slate-100">
            GPS location <span className="font-normal text-slate-400 dark:text-slate-500">(recommended)</span>
          </span>
          {fix ? (
            <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100">
              <span>
                📍 {fix.lat.toFixed(5)}, {fix.lng.toFixed(5)} <span className="text-xs opacity-75">(±{fix.accuracyM} m)</span>
              </span>
              <button type="button" onClick={() => setFix(null)} className="py-1 text-xs font-medium underline">
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={addLocation}
              disabled={locating}
              className="mt-1.5 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-navy-800 hover:bg-slate-50 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              {locating ? (
                <>
                  <Spinner /> Getting your location…
                </>
              ) : (
                "📍 Add my current location"
              )}
            </button>
          )}
          {locError && <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{locError}</p>}
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Helps the field officer find the exact spot.</p>
        </div>

        <div>
          <span className="block text-sm font-semibold text-navy-900 dark:text-slate-100">
            Photo <span className="font-normal text-slate-400 dark:text-slate-500">(optional)</span>
          </span>
          <input ref={fileRef} type="file" accept="image/*" onChange={onPhoto} className="hidden" id="photo" />
          {photo ? (
            <div className="mt-1.5 flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="Photo preview" className="h-28 w-28 rounded-lg border object-cover dark:border-slate-700" />
              <div className="flex flex-col gap-1 text-sm">
                <label htmlFor="photo" className="cursor-pointer py-1 font-medium text-navy-600 hover:underline dark:text-navy-300">
                  Change photo
                </label>
                <button type="button" onClick={clearPhoto} className="py-1 text-left text-red-600 hover:underline dark:text-red-400">
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <label
              htmlFor="photo"
              className="mt-1.5 flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed border-slate-300 px-3 py-6 text-sm text-slate-500 hover:border-navy-500 hover:text-navy-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-navy-400 dark:hover:text-navy-200"
            >
              {photoBusy ? (
                <>
                  <Spinner /> Compressing photo…
                </>
              ) : (
                <>
                  <span className="text-2xl">📷</span>
                  Take or upload a photo
                </>
              )}
            </label>
          )}
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:bg-red-950/60 dark:text-red-200">
            <span aria-hidden>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || photoBusy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-3.5 font-semibold text-white transition hover:bg-navy-800 dark:bg-navy-500 dark:hover:bg-navy-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? (
            <>
              <Spinner /> AI is analysing your complaint...
            </>
          ) : (
            "Submit complaint"
          )}
        </button>

        {loading && (
          <div className="absolute inset-0 grid place-items-center rounded-2xl bg-white/85 backdrop-blur-[1px] dark:bg-slate-900/90" aria-live="polite">
            <div className="flex flex-col items-center gap-3 px-4 text-center text-navy-900 dark:text-white">
              <Spinner className="h-10 w-10" />
              <p className="font-semibold">AI is analysing your complaint...</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Classifying, rating severity and routing. This usually takes a few seconds.</p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
