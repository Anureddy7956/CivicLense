"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/lib/role";
import { isActive, tabsFor } from "@/lib/nav";

/** Mobile bottom tab bar (hidden on md+ where the header shows links). Tabs depend on the role. */
export default function BottomNav() {
  const path = usePathname();
  const tabs = tabsFor(useRole());
  if (tabs.length === 0) return null;
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/95"
    >
      <ul className="mx-auto flex max-w-md">
        {tabs.map((t) => {
          const active = isActive(t.href, path);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition ${
                  active ? "text-navy-700 dark:text-white" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <span className={`grid h-8 w-12 place-items-center rounded-full text-lg ${active ? "bg-navy-100 dark:bg-navy-700" : ""}`} aria-hidden>
                  {t.icon}
                </span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
