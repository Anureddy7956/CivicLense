"use client";

import { usePathname, useRouter } from "next/navigation";
import { setRole, useRole } from "@/lib/role";
import { tabsFor, isActive } from "@/lib/nav";
import { PERSONAS } from "@/lib/workflow";
import { ROLES, type Role } from "@/lib/types";

/** Demo role switcher (no real login). Switching jumps to that role's home if the current page isn't theirs. */
export default function RoleSwitcher() {
  const role = useRole();
  const router = useRouter();
  const path = usePathname();

  function change(next: Role) {
    setRole(next);
    if (!tabsFor(next).some((t) => isActive(t.href, path))) router.push(PERSONAS[next].home);
  }

  return (
    <label className="relative flex items-center">
      <span className="sr-only">Demo role</span>
      <select
        value={role ?? ""}
        onChange={(e) => change(e.target.value as Role)}
        className="h-9 max-w-[9.5rem] appearance-none truncate rounded-md border border-navy-600 bg-navy-800 py-1 pl-2 pr-7 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-navy-300 sm:max-w-none"
      >
        {role === null && <option value="">…</option>}
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {PERSONAS[r].icon} {PERSONAS[r].label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 text-xs text-navy-200" aria-hidden>
        ▾
      </span>
    </label>
  );
}
