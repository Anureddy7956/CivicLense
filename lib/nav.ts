import type { Role } from "./types";

export interface Tab {
  href: string;
  label: string;
  icon: string;
  roles: Role[];
}

/** Bottom tabs / header links, filtered by the current demo role. */
export const TABS: Tab[] = [
  { href: "/", label: "Report", icon: "📝", roles: ["citizen"] },
  { href: "/my", label: "My Complaints", icon: "📋", roles: ["citizen"] },
  { href: "/field", label: "Field", icon: "🦺", roles: ["field_officer"] },
  { href: "/authority", label: "Authority", icon: "🏛️", roles: ["authority"] },
  { href: "/dashboard", label: "Dashboard", icon: "📊", roles: ["field_officer", "authority"] },
];

export const tabsFor = (role: Role | null) => TABS.filter((t) => role !== null && t.roles.includes(role));

export const isActive = (href: string, path: string) => (href === "/" ? path === "/" : path.startsWith(href));
