// Keep macOS from treating the local dev Electron binary as malware.
//
// `npm run dev` launches node_modules/electron's Electron.app directly. On
// recent macOS (Sequoia/Tahoe) Gatekeeper blocks that unsigned app — and has
// been seen to move it to the Trash outright — so the dev build won't open.
//
// This restores the binary when it has been trashed, strips the quarantine /
// provenance attributes, and re-signs it ad-hoc so Gatekeeper accepts a local
// launch. macOS-only; a no-op on every other platform so postinstall stays
// cross-platform.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

if (process.platform !== "darwin") {
  process.exit(0);
}

const electronDir = path.join(process.cwd(), "node_modules", "electron");
const app = path.join(electronDir, "dist", "Electron.app");

const run = (command, args) => {
  try {
    execFileSync(command, args, { stdio: "inherit" });
    return true;
  } catch (error) {
    console.warn(`[mac-electron] ${command} failed: ${error.message}`);
    return false;
  }
};

// Gatekeeper may have already deleted the app on a previous launch. Electron's
// own installer re-downloads it, because its check keys off the binary existing.
if (!existsSync(app)) {
  console.log("[mac-electron] Electron.app is missing — reinstalling…");
  run(process.execPath, [path.join(electronDir, "install.js")]);
}

if (!existsSync(app)) {
  console.warn("[mac-electron] Electron.app still missing; skipping signing.");
  process.exit(0);
}

// Clear quarantine/provenance, then give it a valid ad-hoc signature.
run("xattr", ["-cr", app]);
if (run("codesign", ["--force", "--deep", "--sign", "-", app])) {
  console.log("[mac-electron] ad-hoc signed Electron.app for local development.");
}
