"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Spinner } from "./Badges";

export const VOICE_LANGUAGES = [
  { code: "en-IN", label: "English" },
  { code: "kn-IN", label: "ಕನ್ನಡ Kannada" },
  { code: "hi-IN", label: "हिन्दी Hindi" },
  { code: "ta-IN", label: "தமிழ் Tamil" },
  { code: "te-IN", label: "తెలుగు Telugu" },
  { code: "ml-IN", label: "മലയാളം Malayalam" },
  { code: "mr-IN", label: "मराठी Marathi" },
] as const;

const MAX_SECONDS = 60;
const LANG_KEY = "civiclens.voiceLang";
const LANG_EVENT = "civiclens:voiceLang";
const DEFAULT_LANG = "kn-IN";

// Remembered speaking language (localStorage), read without a hydration mismatch.
const subscribeLang = (cb: () => void) => {
  window.addEventListener(LANG_EVENT, cb);
  return () => window.removeEventListener(LANG_EVENT, cb);
};
const readLang = () => {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    return saved && VOICE_LANGUAGES.some((l) => l.code === saved) ? saved : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
};

export interface VoiceResult {
  transcript: string;
  englishTranslation: string;
  language: string;
  audio: string; // data URL (compressed Opus/AAC)
  durationSec: number;
}

// Minimal typing for the Web Speech API (not in TS's DOM lib everywhere).
interface SpeechRec {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SpeechRecCtor = new () => SpeechRec;

function speechRecognition(): SpeechRecCtor | null {
  const w = window as unknown as { SpeechRecognition?: SpeechRecCtor; webkitSpeechRecognition?: SpeechRecCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Best compressed format this browser can record: Opus (Chrome/Firefox/Android) or AAC (Safari/iOS). */
function pickMime(): string | undefined {
  const options = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/webm"];
  return options.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m));
}

function micError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Microphone access is blocked. Tap the 🔒 icon in the address bar, allow the microphone for this site, then try again. You can also type your complaint.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No microphone found on this device. Please type your complaint.";
  if (name === "NotReadableError") return "Your microphone is being used by another app. Close it and try again.";
  return "Couldn't start the microphone. Please type your complaint instead.";
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * Records a voice complaint with MediaRecorder (works in every modern browser), sends it to /api/transcribe,
 * and returns the original-language transcript + English translation + the audio clip.
 * Where the Web Speech API exists (Chrome, Android), live text is shown while speaking.
 */
export default function VoiceInput({ onResult, disabled }: { onResult: (r: VoiceResult) => void; disabled?: boolean }) {
  const lang = useSyncExternalStore(subscribeLang, readLang, () => DEFAULT_LANG);
  const [stage, setStage] = useState<"idle" | "starting" | "recording" | "transcribing">("idle");
  const [seconds, setSeconds] = useState(0);
  const [live, setLive] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const speech = useRef<SpeechRec | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const liveText = useRef("");

  useEffect(() => () => cleanup(), []); // stop the mic if the user navigates away mid-recording

  function cleanup() {
    clearInterval(timer.current);
    speech.current?.abort();
    speech.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }

  function chooseLang(code: string) {
    try {
      localStorage.setItem(LANG_KEY, code);
    } catch {}
    window.dispatchEvent(new Event(LANG_EVENT));
  }

  async function start() {
    setError(null);
    setLive("");
    liveText.current = "";
    if (!window.isSecureContext) return setError("Voice recording needs the secure https:// link of this site.");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      return setError("This browser can't record audio. Please type your complaint.");
    }
    setStage("starting");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (err) {
      setStage("idle");
      return setError(micError(err));
    }

    const mimeType = pickMime();
    const rec = new MediaRecorder(stream.current, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 24000 });
    chunks.current = [];
    rec.ondataavailable = (e) => e.data.size > 0 && chunks.current.push(e.data);
    rec.onstop = () => void finish(rec.mimeType || mimeType || "audio/webm");
    rec.start(1000);
    recorder.current = rec;
    startedAt.current = Date.now();
    setSeconds(0);
    setStage("recording");
    timer.current = setInterval(() => {
      const s = (Date.now() - startedAt.current) / 1000;
      setSeconds(s);
      if (s >= MAX_SECONDS) stop();
    }, 200);

    // Bonus: live captions where supported. Failures here never affect the recording.
    const SR = speechRecognition();
    if (SR) {
      try {
        const sr = new SR();
        sr.lang = lang;
        sr.continuous = true;
        sr.interimResults = true;
        sr.onresult = (e) => {
          let text = "";
          for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
          liveText.current = text;
          setLive(text);
        };
        sr.onerror = () => {};
        sr.start();
        speech.current = sr;
      } catch {
        speech.current = null;
      }
    }
  }

  function stop() {
    clearInterval(timer.current);
    speech.current?.stop();
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  async function finish(mime: string) {
    const durationSec = Math.min(MAX_SECONDS, Math.round((Date.now() - startedAt.current) / 1000));
    cleanup();
    const blob = new Blob(chunks.current, { type: mime });
    if (durationSec < 1 || blob.size < 1000) {
      setStage("idle");
      return setError("That was too short. Hold the mic button and speak for a few seconds.");
    }
    setStage("transcribing");
    const audio = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });

    const label = VOICE_LANGUAGES.find((l) => l.code === lang)?.label.split(" ").pop() ?? "English";
    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio, language: lang }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.transcript_original) {
        onResult({ transcript: data.transcript_original, englishTranslation: data.english_translation, language: data.language, audio, durationSec });
      } else if (liveText.current.trim()) {
        // AI transcription failed, but the browser heard words: use those (triage translates on submit).
        onResult({ transcript: liveText.current.trim(), englishTranslation: "", language: label, audio, durationSec });
        setError("AI transcription was unavailable, so we used your browser's live text. Please check it.");
      } else {
        setError(data.error || "Couldn't transcribe the recording. Please try again or type your complaint.");
      }
    } catch {
      setError("Can't reach the server to transcribe. Check your connection and try again.");
    } finally {
      setStage("idle");
      setLive("");
    }
  }

  const recording = stage === "recording";
  const busy = stage === "starting" || stage === "transcribing";

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor="voice-lang" className="block text-xs font-medium text-slate-500 dark:text-slate-400">
            Speak in
          </label>
          <select
            id="voice-lang"
            value={lang}
            onChange={(e) => chooseLang(e.target.value)}
            disabled={recording || busy}
            className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-2 text-base disabled:opacity-60 sm:text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            {VOICE_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={recording ? stop : start}
            disabled={disabled || busy}
            aria-label={recording ? "Stop recording" : "Record voice complaint"}
            aria-pressed={recording}
            className={`relative grid h-16 w-16 shrink-0 place-items-center rounded-full text-white shadow-lg transition active:scale-95 disabled:opacity-60 ${
              recording ? "bg-red-600" : "bg-navy-900 hover:bg-navy-800 dark:bg-navy-500 dark:hover:bg-navy-400"
            }`}
          >
            {recording && <span className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-60" aria-hidden />}
            {busy ? (
              <Spinner className="h-7 w-7" />
            ) : recording ? (
              <span className="relative h-6 w-6 rounded-sm bg-white" aria-hidden />
            ) : (
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor" aria-hidden>
                <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z" />
              </svg>
            )}
          </button>
          <span className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {recording ? "Tap to stop" : stage === "transcribing" ? "…" : "Tap to speak"}
          </span>
        </div>
      </div>

      {recording && (
        <div className="mt-3" aria-live="polite">
          <div className="flex items-center justify-between text-sm font-semibold text-red-600 dark:text-red-400">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" /> Recording
            </span>
            <span className="font-mono">
              {fmt(seconds)} / {fmt(MAX_SECONDS)}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-red-100 dark:bg-red-950">
            <div className="h-full bg-red-600 transition-[width]" style={{ width: `${Math.min(100, (seconds / MAX_SECONDS) * 100)}%` }} />
          </div>
          {live && <p className="mt-2 rounded-lg bg-white px-3 py-2 text-sm italic text-slate-700 dark:bg-slate-900 dark:text-slate-300">{live}</p>}
        </div>
      )}
      {stage === "transcribing" && (
        <p className="mt-3 flex items-center gap-2 text-sm text-navy-700 dark:text-navy-200" aria-live="polite">
          <Spinner className="h-4 w-4" /> AI is transcribing your voice…
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
          🎙️ {error}
        </p>
      )}
    </div>
  );
}
