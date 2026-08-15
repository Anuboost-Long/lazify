import { linuxPackageCommand, wingetCommand } from "./package-managers";
import { probeAny } from "./probe";
import type { ToolModule } from "./types";

const PACKAGES = {
  apt: "python3-pip",
  dnf: "python3-pip",
  pacman: "python-pip",
  zypper: "python3-pip"
};

const NAMES = process.platform === "win32" ? ["pip3", "pip"] : ["pip3"];

/**
 * Installed by installing Python everywhere except Linux, which packages it
 * separately. Its own update runs through pip, not the package manager, so it
 * needs the nvm-managed environment no more than Python does — but it is asked
 * for under that node's PATH, so the prefix stays.
 */
export const pip3Tool: ToolModule = {
  name: "pip3",
  displayName: "pip",
  category: "python",
  nvmActions: ["update"],

  probe: () => probeAny(NAMES),

  install() {
    if (process.platform === "darwin") {
      return { command: "brew install python3", note: "pip3 is included with Python 3" };
    }

    if (process.platform === "win32") {
      return {
        command: wingetCommand("Python.Python.3.12", "install"),
        note: "pip is included with Python 3"
      };
    }

    const command = linuxPackageCommand(PACKAGES, "install");
    return command ? { command } : null;
  },

  update: () => "pip3 install --upgrade pip",

  // pip reports its own currency through `pip install --upgrade`; there is
  // nothing cheap to ask beforehand.
  checkUpdate: async () => ({ hasUpdate: true, latestVersion: null, canCheck: false })
};
