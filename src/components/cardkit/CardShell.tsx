import React, { useMemo, useState, Suspense } from "react";
import Skeleton from "./Skeleton";

export type CardTab = {
  id: string;
  title: string;
  testid?: string;
  // EITHER provide a ready element OR a lazy loader
  element?: React.ReactNode;
  lazy?: () => Promise<{ default: React.ComponentType<any> }>;
  // props passed to lazy component when mounted
  props?: Record<string, any>;
};

export function CardShell({
  title,
  hero,
  tabs,
  breadcrumbs,       // e.g., ["Portfolio", "Properties", "14111 Magnolia St"]
  actions,           // e.g., [{label:"Export PDF", onClick:...}, {label:"Edit", onClick:...}]
  rightRail,         // ReactNode | null (320px fixed column)
}: {
  title: React.ReactNode;
  hero?: React.ReactNode;
  tabs: CardTab[];
  breadcrumbs?: string[];
  actions?: { label: string; onClick?: () => void; testid?: string }[];
  rightRail?: React.ReactNode | null;
}) {
  const [active, setActive] = useState(tabs[0]?.id);
  const activeTab = useMemo(() => tabs.find(t => t.id === active), [tabs, active]);

  const LazyComponent = useMemo(() => {
    if (activeTab?.lazy) {
      return React.lazy(activeTab.lazy);
    }
    return null;
  }, [activeTab?.lazy]);

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="text-sm mb-2">
          <ol className="flex gap-1 text-neutral-400">
            {breadcrumbs.map((b, i) => (
              <li key={i} className="flex items-center gap-1">
                <span>{b}</span>
                {i < breadcrumbs.length - 1 && <span>›</span>}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Title + actions */}
      <div className="flex items-start justify-between mb-4">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {actions && actions.length > 0 && (
          <div className="flex gap-2">
            {actions.map((a, idx) => (
              <button
                key={idx}
                data-testid={a.testid ?? `action-${idx}`}
                onClick={a.onClick}
                className="ecc-card-action px-3 py-1.5 rounded-xl border border-neutral-700 hover:bg-neutral-800"
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hero */}
      {hero && <div className="mb-6">{hero}</div>}

      {/* Tabs */}
      <div className="border-b border-neutral-800 mb-4 flex gap-4">
        {tabs.map(t => (
          <button
            key={t.id}
            data-testid={`tab-${t.id}`}
            onClick={() => setActive(t.id)}
            className={`ecc-card-tab pb-2 ${active === t.id ? "is-active border-b-2 border-[#d6b36a] text-white" : "text-neutral-400"}`}
            aria-pressed={active === t.id}
          >
            {t.title}
          </button>
        ))}
      </div>

      {/* Body + Right rail layout */}
      <div className={`grid gap-6 ${rightRail ? "md:grid-cols-[1fr_320px]" : "grid-cols-1"}`}>
        <div data-testid="tab-panel">
          {activeTab?.element && !activeTab?.lazy && activeTab.element}
          {activeTab?.lazy && (
            <Suspense fallback={<Skeleton className="h-24 rounded-xl bg-neutral-900 animate-pulse" />}>
              {LazyComponent ? <LazyComponent {...(activeTab.props ?? {})} /> : null}
            </Suspense>
          )}
        </div>
        {rightRail && <aside className="w-80">{rightRail}</aside>}
      </div>
    </div>
  );
}

// Default export for backward compatibility
export default CardShell;