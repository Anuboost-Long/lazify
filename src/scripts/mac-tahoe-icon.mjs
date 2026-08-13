import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ICON_NAME = "Lazify";

const source = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "build",
  `${ICON_NAME}.icon`
);

export default async function injectTahoeIcon(context) {
  if (context.electronPlatformName !== "darwin" || process.platform !== "darwin") {
    return;
  }

  if (!existsSync(source)) {
    console.warn(`[mac-icon] no ${ICON_NAME}.icon in build/ — legacy icns only`);
    return;
  }

  const app = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`
  );
  const resources = path.join(app, "Contents", "Resources");
  const infoPlist = path.join(app, "Contents", "Info.plist");
  const out = mkdtempSync(path.join(tmpdir(), "lazify-icon-"));

  try {
    execFileSync(
      "actool",
      [
        source,
        "--compile",
        out,
        "--app-icon",
        ICON_NAME,
        "--platform",
        "macosx",
        "--minimum-deployment-target",
        "26.0",
        "--output-partial-info-plist",
        path.join(out, "partial.plist"),
      ],
      { stdio: "pipe" }
    );

    copyFileSync(path.join(out, "Assets.car"), path.join(resources, "Assets.car"));

    execFileSync("plutil", [
      "-replace",
      "CFBundleIconName",
      "-string",
      ICON_NAME,
      infoPlist,
    ]);

    console.log(`[mac-icon] Assets.car + CFBundleIconName=${ICON_NAME}`);
  } catch (error) {
    console.warn(`[mac-icon] skipped: ${error.message}`);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}
