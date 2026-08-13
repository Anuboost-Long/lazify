import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { findNvmScript, runWithNvm } from "./nvm-shell";
import { compareToLatest } from "./update-checks";
import { CANNOT_CHECK, type ToolModule, type ToolProbe } from "./types";

const execFileAsync = promisify(execFile);

const LATEST_RELEASE_API = "https://api.github.com/repos/nvm-sh/nvm/releases/latest";

async function probeNvm(): Promise<ToolProbe> {
  if (!findNvmScript()) return { available: false, version: null };

  try {
    const { stdout, stderr } = await runWithNvm("nvm --version", 6000);
    const raw = (stdout || stderr).trim();
    return { available: true, version: raw || null };
  } catch {
    return { available: false, version: null };
  }
}

/**
 * Installing nvm is not offered here — it is its own flow in the Node version
 * pane, which has somewhere to put the "restart your shell" that follows.
 * Updating is, because nvm's own instruction for it is to re-run the installer.
 */
export const nvmTool: ToolModule = {
  name: "nvm",
  displayName: "nvm",
  category: "nodejs",

  probe: probeNvm,

  update() {
    // nvm-windows is a different program that this does not drive.
    if (process.platform === "win32") return null;

    return 'LATEST=$(curl -s "https://api.github.com/repos/nvm-sh/nvm/releases/latest" | grep \'"tag_name"\' | cut -d\'"\' -f4) && curl -o- "https://raw.githubusercontent.com/nvm-sh/nvm/${LATEST}/install.sh" | bash';
  },

  async checkUpdate(currentVersion) {
    try {
      const { stdout } = await execFileAsync("curl", ["-s", LATEST_RELEASE_API], {
        timeout: 8000,
        maxBuffer: 1024 * 1024
      });
      return compareToLatest(currentVersion, stdout.match(/"tag_name"\s*:\s*"v?([^"]+)"/)?.[1] ?? null);
    } catch {
      return CANNOT_CHECK;
    }
  }
};
