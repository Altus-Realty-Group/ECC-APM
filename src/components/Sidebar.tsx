import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { createPortal } from "react-dom";
import {
  BarChart3, Boxes, Building2, ChevronDown, ChevronRight, Circle, Database, FileSpreadsheet,
  FileText, IdCard, LayoutDashboard, Link2, Package, Pin, PinOff, Settings, Users,
  type LucideIcon,
} from "lucide-react";
import {
  NAV_SECTIONS, activeSectionTitle, isPathActive,
  type IconName, type NavLeaf, type NavSection,
} from "@/config/navigation";
import { clampToViewport, isKeyboardInitiatedClick, menuKeyAction, opensFlyoutFromTrigger } from "./nav/menuKeys";

const LOGO_WIDE = "/brand/altus-logo.png";
const LOGO_SQUARE = "/brand/altus-mark.png";
const STORAGE_KEY = "ecc.sidebar.collapsed";
const OPEN_DELAY_MS = 80;
const CLOSE_DELAY_MS = 300;
const FLYOUT_WIDTH = 288;

const ICONS: Record<IconName, LucideIcon> = {
  LayoutDashboard, Boxes, BarChart3, Database, Link2, Building2, Package,
  FileSpreadsheet, Users, IdCard, FileText, Settings,
};
const iconOf = (name?: IconName): LucideIcon => (name && ICONS[name]) || Circle;

function SafeImg({ src, alt, style }: { src: string; alt: string; style?: React.CSSProperties }) {
  const [ok, setOk] = useState(true);
  useEffect(() => { setOk(true); }, [src]);
  if (!ok) return null;
  return <img src={src} alt={alt} style={{ display: "block", ...style }} onError={() => setOk(false)} draggable={false} />;
}

/** Small screens start on the narrow rail so content keeps its width; a saved choice always wins. */
const SMALL_SCREEN = "(max-width: 1024px)";
function initialCollapsed(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) return JSON.parse(saved) === true;
  } catch { /* storage unavailable: fall through to the viewport default */ }
  try { return typeof window !== "undefined" && window.matchMedia(SMALL_SCREEN).matches; }
  catch { return false; }
}

function useCollapsed() {
  const [collapsed, setCollapsed] = useState<boolean>(initialCollapsed);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsed)); } catch { /* storage unavailable */ }
  }, [collapsed]);
  return { collapsed, setCollapsed };
}

/* ---------- Direct link row (no children) ---------- */
function NavLinkRow({ section, collapsed, active }: { section: NavSection; collapsed: boolean; active: boolean }) {
  const Icon = iconOf(section.icon);
  return (
    <li className="ecc-nav-item">
      <Link
        href={section.path!}
        className={`ecc-nav-row ${active ? "is-active" : ""}`}
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? section.title : undefined}
        title={collapsed ? section.title : undefined}
      >
        <span className="ecc-icon-wrap"><Icon size={20} aria-hidden="true" /></span>
        {!collapsed && <span className="ecc-label">{section.title}</span>}
      </Link>
    </li>
  );
}

/* ---------- Flyout (collapsed rail) ---------- */
function Flyout({
  title, items, position, location, focusFirst, onClose, onRestoreFocus, triggerEl,
}: {
  title: string;
  items: NavLeaf[];
  position: { left: number; top: number };
  location: string;
  focusFirst: boolean;
  onClose: () => void;
  onRestoreFocus: () => void;
  triggerEl: HTMLElement | null;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuItems = () =>
    Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? []);

  useEffect(() => {
    if (focusFirst) menuItems()[0]?.focus();
  }, [focusFirst]);

  // Close on outside press (mouse or touch) and when focus leaves both trigger and flyout.
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (rootRef.current?.contains(t) || triggerEl?.contains(t)) return;
      onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [onClose, triggerEl]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const els = menuItems();
    const current = els.findIndex((el) => el === document.activeElement);
    const action = menuKeyAction(e.key, current, els.length);
    if (action.type === "focus") {
      e.preventDefault();
      els[action.index]?.focus();
    } else if (action.type === "close") {
      e.preventDefault();
      onClose();
      onRestoreFocus();
    }
  };

  const onBlur = (e: React.FocusEvent) => {
    const next = e.relatedTarget as Node | null;
    if (!next) return; // pointer interactions handled by pointerdown
    if (rootRef.current?.contains(next) || triggerEl?.contains(next)) return;
    onClose();
  };

  return (
    <div
      ref={rootRef}
      className="ecc-flyout"
      style={{ position: "fixed", left: position.left, top: position.top, width: FLYOUT_WIDTH, zIndex: 1000 }}
      role="menu"
      aria-label={title}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    >
      <div className="ecc-flyout-head"><span className="ecc-flyout-head-title">{title}</span></div>
      <div className="ecc-flyout-list">
        {items.map((c) => {
          const CIcon = iconOf(c.icon);
          const active = !c.unavailable && isPathActive(location, c.path);
          if (c.unavailable) return (
            <div key={c.path} className="ecc-flyout-item ecc-nav-unavailable" role="menuitem" aria-disabled="true">
              <CIcon className="ecc-flyout-icon" size={16} aria-hidden="true" />
              <span>{c.title}<span className="ecc-nav-status">Not available</span></span>
            </div>
          );
          return (
            <Link
              key={c.path}
              href={c.path}
              className={`ecc-flyout-item ${active ? "is-active" : ""}`}
              role="menuitem"
              aria-current={active ? "page" : undefined}
              onClick={onClose}
            >
              <CIcon className="ecc-flyout-icon" size={16} aria-hidden="true" />
              <span className="ecc-flyout-label">{c.title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Group row (has children) ---------- */
function NavGroupRow({
  section, collapsed, location, expanded, onToggleExpanded, flyoutOpen, onFlyoutChange,
}: {
  section: NavSection;
  collapsed: boolean;
  location: string;
  expanded: boolean;
  onToggleExpanded: () => void;
  flyoutOpen: boolean;
  onFlyoutChange: (open: boolean) => void;
}) {
  const Icon = iconOf(section.icon);
  const children = section.children ?? [];
  const groupActive = children.some((c) => !c.unavailable && isPathActive(location, c.path));
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const [focusFirst, setFocusFirst] = useState(false);

  const clearTimers = () => {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  };
  useEffect(() => clearTimers, []);

  const openFlyout = useCallback((viaKeyboard: boolean) => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const estH = Math.min(44 * children.length + 56, window.innerHeight - 16);
    const { x, y } = clampToViewport(rect.right + 6, rect.top, FLYOUT_WIDTH, estH, window.innerWidth, window.innerHeight);
    setPosition({ left: x, top: y });
    setFocusFirst(viaKeyboard);
    onFlyoutChange(true);
  }, [children.length, onFlyoutChange]);

  const closeFlyout = useCallback(() => { clearTimers(); onFlyoutChange(false); }, [onFlyoutChange]);

  const onClick = (e: React.MouseEvent) => {
    if (!collapsed) { onToggleExpanded(); return; }
    if (flyoutOpen) { closeFlyout(); return; }
    // Enter/Space arrive as a click with detail 0: move focus to the first item, like ArrowRight/Down.
    // Mouse and touch keep focus where it is so a tap does not pop a focus ring.
    openFlyout(isKeyboardInitiatedClick(e.detail));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (collapsed && opensFlyoutFromTrigger(e.key)) {
      e.preventDefault();
      openFlyout(true);
    } else if (e.key === "Escape" && flyoutOpen) {
      e.preventDefault();
      closeFlyout();
    }
  };

  // Hover is a convenience for mouse only; touch and keyboard use click/keys above.
  const onPointerEnter = (e: React.PointerEvent) => {
    if (!collapsed || e.pointerType !== "mouse") return;
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    openTimer.current = window.setTimeout(() => openFlyout(false), OPEN_DELAY_MS);
  };
  const onPointerLeave = (e: React.PointerEvent) => {
    if (!collapsed || e.pointerType !== "mouse") return;
    if (openTimer.current) window.clearTimeout(openTimer.current);
    closeTimer.current = window.setTimeout(() => onFlyoutChange(false), CLOSE_DELAY_MS);
  };
  const keepFlyoutOpen = () => { if (closeTimer.current) window.clearTimeout(closeTimer.current); };
  const leaveFlyout = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    closeTimer.current = window.setTimeout(() => onFlyoutChange(false), CLOSE_DELAY_MS);
  };

  const showFlyout = collapsed && flyoutOpen && typeof document !== "undefined";

  return (
    <li className="ecc-nav-item" onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
      <button
        ref={triggerRef}
        type="button"
        className={`ecc-nav-row ${groupActive ? "is-active" : ""}`}
        aria-expanded={collapsed ? flyoutOpen : expanded}
        aria-controls={collapsed ? undefined : panelId}
        aria-haspopup={collapsed ? "menu" : undefined}
        aria-label={collapsed ? section.title : undefined}
        title={collapsed ? section.title : undefined}
        onClick={onClick}
        onKeyDown={onKeyDown}
      >
        <span className="ecc-icon-wrap"><Icon size={20} aria-hidden="true" /></span>
        {!collapsed && (
          <>
            <span className="ecc-label">{section.title}</span>
            <span className="ecc-caret" aria-hidden="true">
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
          </>
        )}
      </button>

      {!collapsed && expanded && (
        <ul id={panelId} className="ecc-children">
          {children.map((c) => {
            const CIcon = iconOf(c.icon);
            const active = !c.unavailable && isPathActive(location, c.path);
            if (c.unavailable) return (
              <li key={c.path}>
                <span className="ecc-child ecc-nav-unavailable" aria-disabled="true">
                  <CIcon className="ecc-child-icon" size={16} aria-hidden="true" />
                  <span>{c.title}<span className="ecc-nav-status">Not available</span></span>
                </span>
              </li>
            );
            return (
              <li key={c.path}>
                <Link
                  href={c.path}
                  className={`ecc-child ${active ? "is-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <CIcon className="ecc-child-icon" size={16} aria-hidden="true" />
                  <span className="ecc-child-label">{c.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {showFlyout &&
        createPortal(
          <div onPointerEnter={keepFlyoutOpen} onPointerLeave={leaveFlyout}>
            <Flyout
              title={section.title}
              items={children}
              position={position}
              location={location}
              focusFirst={focusFirst}
              onClose={closeFlyout}
              onRestoreFocus={() => triggerRef.current?.focus()}
              triggerEl={triggerRef.current}
            />
          </div>,
          document.body,
        )}
    </li>
  );
}

/* ---------- Sidebar ---------- */
export default function Sidebar() {
  const [location] = useLocation();
  const { collapsed, setCollapsed } = useCollapsed();
  const [expandedTitle, setExpandedTitle] = useState<string | null>(() => activeSectionTitle(location));
  const [flyoutTitle, setFlyoutTitle] = useState<string | null>(null);

  // Follow navigation: open the section that owns the current page, close any flyout.
  useEffect(() => {
    setExpandedTitle(activeSectionTitle(location));
    setFlyoutTitle(null);
  }, [location]);

  return (
    <aside className={`ecc-sidebar ${collapsed ? "is-collapsed" : "is-expanded"}`}>
      <div className="ecc-sidebar__inner">
        <div className="ecc-header">
          <Link href="/" className="ecc-logo-link" aria-label="Altus home">
            <SafeImg
              src={collapsed ? LOGO_SQUARE : LOGO_WIDE}
              alt="Altus"
              style={{ filter: "brightness(1.75)", height: collapsed ? 52 : 60, width: "auto", objectFit: "contain" }}
            />
          </Link>
        </div>

        <nav className="ecc-scroll" aria-label="Primary">
          <ul className="ecc-nav-list">
            {NAV_SECTIONS.map((section) =>
              section.children?.length ? (
                <NavGroupRow
                  key={section.title}
                  section={section}
                  collapsed={collapsed}
                  location={location}
                  expanded={expandedTitle === section.title}
                  onToggleExpanded={() =>
                    setExpandedTitle((cur) => (cur === section.title ? null : section.title))}
                  flyoutOpen={flyoutTitle === section.title}
                  onFlyoutChange={(open) =>
                    setFlyoutTitle((cur) => (open ? section.title : cur === section.title ? null : cur))}
                />
              ) : (
                <NavLinkRow
                  key={section.title}
                  section={section}
                  collapsed={collapsed}
                  active={isPathActive(location, section.path)}
                />
              ),
            )}
          </ul>
        </nav>

        <div className="ecc-footer">
          <button
            type="button"
            className="ecc-pin"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            aria-expanded={!collapsed}
          >
            {collapsed ? <PinOff size={16} aria-hidden="true" /> : <Pin size={16} aria-hidden="true" />}
            {!collapsed && <span className="ecc-pin-label">Collapse</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
