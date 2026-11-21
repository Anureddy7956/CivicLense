"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Report" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function Navbar() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-20 bg-navy-900 text-white shadow">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-navy-900">◎</span>
          <span className="text-lg">CivicLens</span>
          <span className="hidden rounded bg-navy-700 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-navy-100 sm:inline">
            Bengaluru
          </span>
        </Link>
        <div className="flex gap-1 text-sm font-medium">
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-2 transition ${active ? "bg-white text-navy-900" : "text-navy-100 hover:bg-navy-700"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
