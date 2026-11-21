"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/lib/role";
import { isActive, tabsFor } from "@/lib/nav";
import ThemeToggle from "./ThemeToggle";
import RoleSwitcher from "./RoleSwitcher";

/** Top bar: logo, desktop links (mobile uses BottomNav), role switcher, theme toggle. */
export default function Navbar() {
  const path = usePathname();
  const tabs = tabsFor(useRole());
  return (
    <header className="sticky top-0 z-30 bg-navy-900 pt-[env(safe-area-inset-top)] text-white shadow dark:border-b dark:border-navy-800 dark:bg-navy-950">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-navy-900">◎</span>
          <span className="hidden text-lg min-[400px]:inline">CivicLens</span>
        </Link>
        <div className="hidden items-center gap-1 text-sm font-medium md:flex">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              aria-current={isActive(t.href, path) ? "page" : undefined}
              className={`rounded-md px-3 py-2 transition ${isActive(t.href, path) ? "bg-white text-navy-900" : "text-navy-100 hover:bg-navy-700"}`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <RoleSwitcher />
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
