import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Navbar from "@/components/Navbar";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CivicLens – AI triage for citizen complaints",
  description: "Report civic issues in Bengaluru in any language. AI classifies, prioritises and routes them to BBMP, BWSSB or BESCOM.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">
        <Navbar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-10">{children}</main>
        <footer className="border-t bg-white py-4 text-center text-xs text-slate-500">
          CivicLens · Hackathon prototype · Tickets are stored only in this browser
        </footer>
      </body>
    </html>
  );
}
