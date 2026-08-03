// Ad-hoc sign the packaged app so it opens on Macs other than this one.
//
// Notarizing needs a Developer ID Application certificate, which needs a paid
// Apple Developer Program membership. Without one, electron-builder falls back
// to the Apple Development certificate in the keychain — valid only on Macs
// provisioned for that team, so Gatekeeper reports the download as "damaged"
// everywhere else and offers no way past it. `identity: null` in the mac config
// turns that fallback off, and this hook signs ad-hoc in its place: still
// untrusted, but the block downgrades to the "unidentified developer" prompt
// the user can approve.
//
// This runs from afterPack, not afterSign — electron-builder skips the
// afterSign hook entirely when no signing occurred.
//
// macOS-only; a no-op on every other platform so the Windows build is unaffected.

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const entitlements = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "build",
  "entitlements.mac.plist"
);

const run = (command, args) => {
  try {
    execFileSync(command, args, { stdio: "inherit" });
    return true;
  } catch (error) {
    console.warn(`[mac-adhoc] ${command} failed: ${error.message}`);
    return false;
  }
};

export default async function adhocSign(context) {
  if (context.electronPlatformName !== "darwin" || process.platform !== "darwin") {
    return;
  }

  const app = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`
  );

  // A quarantine or provenance attribute picked up during the build would be
  // sealed into the signature, so clear them before signing.
  run("xattr", ["-cr", app]);

  // The same hardened runtime and entitlements electron-builder would have
  // applied, just with the ad-hoc identity in place of a certificate.
  const signed = run("codesign", [
    "--force",
    "--deep",
    "--sign",
    "-",
    "--options",
    "runtime",
    "--entitlements",
    entitlements,
    app,
  ]);

  if (signed) {
    console.log(`[mac-adhoc] ad-hoc signed ${app}`);
  }
}
