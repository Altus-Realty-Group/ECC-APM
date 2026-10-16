// src/components/layout/navConfig.ts
// Compatibility view only. The single navigation source is src/config/navigation.ts;
// this file derives from it so the two can never drift. Do not add links here.
import { NAV_SECTIONS } from "@/config/navigation";

export type NavLink = {
  label: string;
  to: string;
};

export type NavSection = {
  title: string;
  items: NavLink[];
};

export const navSections: NavSection[] = NAV_SECTIONS.map((section) => ({
  title: section.title,
  items: section.path
    ? [{ label: section.title, to: section.path }]
    : (section.children ?? []).filter((child) => !child.unavailable).map((child) => ({ label: child.title, to: child.path })),
}));

export const navItems: NavLink[] = navSections.flatMap((s) => s.items);

const navConfig = { sections: navSections, items: navItems };
export default navConfig;
