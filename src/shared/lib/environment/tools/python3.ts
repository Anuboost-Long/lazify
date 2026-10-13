import { host } from "../host";
import { linuxPackageCommand, wingetCommand } from "./package-managers";
import { probeAny } from "./probe";
import type { ToolModule } from "./types";
import { brewOutdated } from "./update-checks";

const WINGET_ID = "Python.Python.3.12";

const PACKAGES = {
  apt: "python3",
  dnf: "python3",
  pacman: "python",
  zypper: "python3"
};

/**
 * Windows spells the interpreter `python`; `python3` there is usually the Store
 * stub that prints nothing. The POSIX name is still tried first, so the macOS
 * and Linux answer is unchanged.
 */
const names = () => (host.platform === "win32" ? ["python3", "python"] : ["python3"]);

export const python3Tool: ToolModule = {
  name: "python3",
  displayName: "Python 3",
  category: "python",

  probe: () => probeAny(names()),

  install() {
    if (host.platform === "darwin") return { command: "brew install python3" };
    if (host.platform === "win32") return { command: wingetCommand(WINGET_ID, "install") };

    const command = linuxPackageCommand(PACKAGES, "install");
    return command ? { command } : null;
  },

  update() {
    if (host.platform === "darwin") return "brew upgrade python3";
    if (host.platform === "win32") return wingetCommand(WINGET_ID, "upgrade");

    return linuxPackageCommand(PACKAGES, "upgrade");
  },

  checkUpdate: () => brewOutdated("python3")
};
