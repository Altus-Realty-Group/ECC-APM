// Pure keyboard helpers for the sidebar flyout menu. No DOM access so they can be unit-tested.

export type MenuKeyAction =
  | { type: "focus"; index: number }
  | { type: "close" }
  | { type: "none" };

/** Roving-focus navigation for a vertical menu with `count` items. */
export function menuKeyAction(key: string, current: number, count: number): MenuKeyAction {
  if (count <= 0) return key === "Escape" ? { type: "close" } : { type: "none" };
  switch (key) {
    case "ArrowDown":
      return { type: "focus", index: current < 0 ? 0 : (current + 1) % count };
    case "ArrowUp":
      return { type: "focus", index: current <= 0 ? count - 1 : current - 1 };
    case "Home":
      return { type: "focus", index: 0 };
    case "End":
      return { type: "focus", index: count - 1 };
    case "Escape":
      return { type: "close" };
    default:
      return { type: "none" };
  }
}

/** Keys on a collapsed-rail trigger that should open its flyout (Enter/Space also fire click). */
export function opensFlyoutFromTrigger(key: string): boolean {
  return key === "ArrowRight" || key === "ArrowDown";
}

/** Clamp a fixed-position box inside the viewport with an 8px margin. */
export function clampToViewport(
  x: number, y: number, w: number, h: number, vw: number, vh: number,
): { x: number; y: number } {
  let nx = Math.max(8, x);
  let ny = Math.max(8, y);
  if (nx + w > vw - 8) nx = Math.max(8, vw - w - 8);
  if (ny + h > vh - 8) ny = Math.max(8, vh - h - 8);
  return { x: nx, y: ny };
}

/**
 * A click with detail === 0 was not made with a pointer: it is the click browsers synthesize for Enter or
 * Space on a button (and what assistive tech sends). Pointer and touch clicks report detail >= 1.
 */
export function isKeyboardInitiatedClick(detail: number): boolean {
  return detail === 0;
}
