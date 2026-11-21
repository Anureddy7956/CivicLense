import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import PwaSetup from "@/components/PwaSetup";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CivicLens – AI triage for citizen complaints",
  description: "Report civic issues in Bengaluru in any language. AI classifies, prioritises and routes them to BBMP, BWSSB or BESCOM.",
  applicationName: "CivicLens",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "CivicLens", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b1f3a", // navbar colour, both themes
};

// Runs before first paint: saved choice, else the phone/laptop's system setting. No flash.
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning className={`${geistSans.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
        <Navbar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:pt-8 md:pb-10">{children}</main>
        <footer className="hidden border-t border-slate-200 bg-white py-4 text-center md:block text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          CivicLens · Hackathon prototype · BBMP · BWSSB · BESCOM
        </footer>
        <BottomNav />
        <PwaSetup />
      </body>
    </html>
  );
}
