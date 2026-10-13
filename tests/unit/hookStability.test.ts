import { test } from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { read } from "./helpers";

/** Files whose list rendering was reworked; hooks must never run inside .map callbacks. */
const FILES = [
  "src/components/Sidebar.tsx",
  "src/App.tsx",
  "src/features/dashboard/pages/DashboardPage.tsx",
  "src/pages/card/property/index.tsx",
  "src/features/command-surface/CanonicalDenseTableShell.tsx",
];

function hooksInsideMapCallbacks(rel: string): string[] {
  const sf = ts.createSourceFile(rel, read(rel), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: string[] = [];
  const isHook = (n: ts.CallExpression) => {
    const e = n.expression;
    const name = ts.isIdentifier(e) ? e.text : ts.isPropertyAccessExpression(e) ? e.name.text : "";
    return /^use[A-Z0-9]/.test(name);
  };
  const visit = (node: ts.Node, inMap: boolean) => {
    let next = inMap;
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const isMap = ts.isPropertyAccessExpression(callee) && ["map", "flatMap", "forEach"].includes(callee.name.text);
      if (inMap && isHook(node)) {
        found.push(`${rel}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1} ${node.expression.getText()}`);
      }
      if (isMap) {
        node.arguments.forEach((arg) => {
          if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) visit(arg.body, true);
        });
        visit(callee, inMap);
        return;
      }
    }
    ts.forEachChild(node, (c) => visit(c, next));
  };
  visit(sf, false);
  return found;
}

for (const rel of FILES) {
  test(`no hooks inside map/forEach callbacks: ${rel}`, () => {
    assert.deepEqual(hooksInsideMapCallbacks(rel), []);
  });
}

test("detector actually catches the original defect pattern", () => {
  const sf = ts.createSourceFile("x.tsx", "const a = NAV.map((p) => { const r = useRef(null); return r; });", ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let hit = false;
  const walk = (n: ts.Node, inMap: boolean) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && /^use/.test(n.expression.text) && inMap) hit = true;
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === "map") {
      n.arguments.forEach((a) => ts.isArrowFunction(a) && walk(a.body, true));
      return;
    }
    ts.forEachChild(n, (c) => walk(c, inMap));
  };
  walk(sf, false);
  assert.equal(hit, true);
});
