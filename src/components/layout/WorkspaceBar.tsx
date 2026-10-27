import React from "react";
import { Link, useLocation } from "wouter";
import { NAV_SECTIONS, isPathActive } from "@/config/navigation";

/** Navigation only: never interprets an app route as proof of account access. */
export default function WorkspaceBar() {
  const [location, navigate] = useLocation();
  const pages = NAV_SECTIONS.flatMap(section => section.path
    ? [{ path: section.path, title: section.title, group: "Overview" }]
    : (section.children ?? []).filter(child => !child.unavailable)
      .map(child => ({ ...child, group: section.title })));
  const current = pages.filter(page => isPathActive(location, page.path))
    .sort((a, b) => b.path.length - a.path.length)[0];
  return <header className="ecc-workspace-bar">
    <div className="ecc-workspace-brand"><Link href="/dashboard">ECC <span>APM</span></Link>
      <span className="ecc-workspace-location">{current ? `${current.group} / ${current.title}` : "Record workspace"}</span>
    </div>
    <label className="ecc-workspace-switcher">Open page
      <select aria-label="Open page" value={current?.path ?? ""} onChange={event => navigate(event.target.value)}>
        {!current ? <option value="" disabled>Choose a workspace</option> : null}
        {pages.map(page => <option key={page.path} value={page.path}>{page.group === "Overview" ? page.title : `${page.group} / ${page.title}`}</option>)}
      </select>
    </label>
  </header>;
}
