// Test-only: lets Node import components that side-effect-import .css (Vite handles these in the app).
import { register } from "node:module";
register("./css-hooks.mjs", import.meta.url);
