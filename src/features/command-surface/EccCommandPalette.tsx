import React, { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import { Building2, Command as CommandIcon, LayoutDashboard, Link2, Search, Shield } from "lucide-react";
import { useLocation } from "wouter";
import { CommandSurfaceConfig } from "./types";
import "@/styles/command-surface.css";

type CommandItem = {
  id: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  path?: string;
  action?: () => void;
};

type Props = {
  config?: CommandSurfaceConfig;
  onFocusSearch?: () => void;
};

export default function EccCommandPalette({ config, onFocusSearch }: Props) {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isHotkey = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (!isHotkey) return;
      event.preventDefault();
      setOpen((current) => !current);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const items = useMemo<CommandItem[]>(
    () => [
      {
        id: "dashboard",
        label: "Open Dashboard",
        hint: "Navigate to ECC overview",
        icon: <LayoutDashboard size={16} />,
        path: "/dashboard",
      },
      {
        id: "surface",
        label: config ? `Open ${config.entityPluralLabel}` : "Open Properties",
        hint: config ? `Go to ${config.title}` : "Go to Type A portfolio proof surface",
        icon: <Building2 size={16} />,
        path: config?.routePath ?? "/portfolio/properties",
      },
      {
        id: "integrations",
        label: "Open Integration Health",
        hint: "Check current systems page",
        icon: <Shield size={16} />,
        path: "/systems/integrations",
      },
      {
        id: "focus-search",
        label: config?.focusCommandLabel ?? "Focus Property Search",
        hint: "Jump to the T2 search surface",
        icon: <Search size={16} />,
        action: () => onFocusSearch?.(),
      },
      {
        id: "dropbox",
        label: "Open Dropbox Integration",
        hint: "Navigate to current integration shell",
        icon: <Link2 size={16} />,
        path: "/integrations/dropbox",
      },
    ],
    [config, onFocusSearch],
  );

  function runItem(item: CommandItem) {
    setOpen(false);
    if (item.path) {
      navigate(item.path);
      return;
    }
    item.action?.();
  }

  return (
    <div className="ecc-command-palette">
      <button
        type="button"
        className="ecc-command-launch"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
      >
        <span className="ecc-command-launch__label">
          <CommandIcon size={15} />
          Command Deck
        </span>
        <span className="ecc-command-launch__hint">Ctrl/Cmd + K</span>
      </button>

      <Command.Dialog open={open} onOpenChange={setOpen} label="ECC command palette" className="ecc-command-dialog">
        <div className="ecc-command-dialog__frame">
          <div className="ecc-command-dialog__header">
            <span className="ecc-command-dialog__eyebrow">Empire Command Center</span>
            <span className="ecc-command-dialog__shortcut">Proof-safe navigation only</span>
          </div>
          <Command.Input className="ecc-command-input" placeholder="Search routes, surfaces, and commands..." />
          <Command.List className="ecc-command-list">
            <Command.Empty className="ecc-command-empty">No matching ECC commands.</Command.Empty>
            <Command.Group heading="Surfaces" className="ecc-command-group">
              {items.map((item) => (
                <Command.Item key={item.id} className="ecc-command-item" onSelect={() => runItem(item)}>
                  <span className="ecc-command-item__icon">{item.icon}</span>
                  <span className="ecc-command-item__copy">
                    <span className="ecc-command-item__label">{item.label}</span>
                    <span className="ecc-command-item__hint">{item.hint}</span>
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </div>
      </Command.Dialog>
    </div>
  );
}
