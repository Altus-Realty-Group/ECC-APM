// Fresh frontend startup. Never boots legacy API, database or vendor jobs.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const [major, minor] = process.versions.node.split(".").map(Number);
if (!((major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major >= 23)) {
  throw new Error("Use Node 20.19+ or Node 22.12+ (package.json engines).");
}
const fingerprint = createHash("sha256").update(readFileSync("package-lock.json")).update(process.versions.node).digest("hex");
const stamp = "node_modules/.ecc-install-fingerprint";
if (!existsSync("node_modules/vite/bin/vite.js") || !existsSync(stamp) || readFileSync(stamp, "utf8") !== fingerprint) {
  const install = spawnSync("npm", ["ci", "--no-audit", "--no-fund"], { stdio: "inherit" });
  if (install.status !== 0) process.exit(install.status ?? 1);
  writeFileSync(stamp, fingerprint);
}
const child = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", process.env.ECC_DEV_HOST || "0.0.0.0", "--port", "5000"], { stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("error", error => { console.error(error); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
