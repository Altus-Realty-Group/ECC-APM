import { test } from "node:test";
import assert from "node:assert/strict";
import Sidebar from "../../src/components/Sidebar";
import { NAV_SECTIONS } from "../../src/config/navigation";

test("nav SSOT exists", () => assert.equal(Array.isArray(NAV_SECTIONS), true));
test("Sidebar is importable", () => assert.equal(typeof Sidebar, "function"));
