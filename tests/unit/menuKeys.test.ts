import { test } from "node:test";
import assert from "node:assert/strict";
import { clampToViewport, isKeyboardInitiatedClick, menuKeyAction, opensFlyoutFromTrigger } from "../../src/components/nav/menuKeys";

test("arrow keys wrap and Home/End jump", () => {
  assert.deepEqual(menuKeyAction("ArrowDown", 0, 3), { type: "focus", index: 1 });
  assert.deepEqual(menuKeyAction("ArrowDown", 2, 3), { type: "focus", index: 0 });
  assert.deepEqual(menuKeyAction("ArrowUp", 0, 3), { type: "focus", index: 2 });
  assert.deepEqual(menuKeyAction("ArrowDown", -1, 3), { type: "focus", index: 0 });
  assert.deepEqual(menuKeyAction("Home", 2, 3), { type: "focus", index: 0 });
  assert.deepEqual(menuKeyAction("End", 0, 3), { type: "focus", index: 2 });
});

test("Escape closes, other keys are ignored, empty menus never focus", () => {
  assert.deepEqual(menuKeyAction("Escape", 1, 3), { type: "close" });
  assert.deepEqual(menuKeyAction("Escape", 0, 0), { type: "close" });
  assert.deepEqual(menuKeyAction("a", 0, 3), { type: "none" });
  assert.deepEqual(menuKeyAction("ArrowDown", 0, 0), { type: "none" });
});

test("trigger opens flyout on ArrowRight/ArrowDown only", () => {
  assert.equal(opensFlyoutFromTrigger("ArrowRight"), true);
  assert.equal(opensFlyoutFromTrigger("ArrowDown"), true);
  assert.equal(opensFlyoutFromTrigger("ArrowLeft"), false);
});

test("flyout is clamped inside the viewport", () => {
  assert.deepEqual(clampToViewport(2, 2, 288, 200, 1000, 800), { x: 8, y: 8 });
  assert.deepEqual(clampToViewport(900, 700, 288, 200, 1000, 800), { x: 704, y: 592 });
});

test("Enter/Space activation (click detail 0) is distinguished from pointer and touch clicks", () => {
  assert.equal(isKeyboardInitiatedClick(0), true);
  assert.equal(isKeyboardInitiatedClick(1), false);
  assert.equal(isKeyboardInitiatedClick(2), false);
});

test("the Sidebar wires keyboard-initiated clicks to focus the first flyout item", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync("src/components/Sidebar.tsx", "utf8");
  assert.match(src, /openFlyout\(isKeyboardInitiatedClick\(e\.detail\)\)/);
  assert.match(src, /if \(focusFirst\) menuItems\(\)\[0\]\?\.focus\(\)/);
});
