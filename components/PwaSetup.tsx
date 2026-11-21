"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "civiclens.installDismissed";

/** Registers the service worker and shows an "Add to Home Screen" prompt (Android install / iOS instructions). */
export default function PwaSetup() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    // Only in production: a service worker caching dev bundles makes development confusing.
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production" && window.isSecureContext) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let dismissed = false;
    try {
      dismissed = Boolean(localStorage.getItem(DISMISS_KEY));
    } catch {}
    if (standalone || dismissed) return;

    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep it for our own button
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS Safari has no install event: show manual instructions after a short delay.
    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
    const t = isIos ? setTimeout(() => setShowIos(true), 4000) : undefined;

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      clearTimeout(t);
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setDeferred(null);
    setShowIos(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  }

  if (!deferred && !showIos) return null;

  return (
    <div
      role="dialog"
      aria-label="Install CivicLens"
      className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-2xl border border-navy-700 bg-navy-900 p-4 text-white shadow-2xl md:bottom-6"
    >
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Add CivicLens to your home screen</p>
          {deferred ? (
            <p className="text-sm text-navy-200">Opens full-screen like an app, one tap from your home screen.</p>
          ) : (
            <p className="text-sm text-navy-200">
              Tap <span aria-label="Share">⬆️ Share</span> in Safari, then <b>“Add to Home Screen”</b>.
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={dismiss} className="min-h-11 flex-1 rounded-lg border border-navy-600 text-sm font-medium text-navy-100">
          Not now
        </button>
        {deferred && (
          <button onClick={install} className="min-h-11 flex-1 rounded-lg bg-white text-sm font-semibold text-navy-900">
            Install app
          </button>
        )}
      </div>
    </div>
  );
}
