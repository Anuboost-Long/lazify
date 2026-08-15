import { linuxPackageCommand, wingetCommand } from "./package-managers";
import { probe } from "./probe";
import { brewOutdated } from "./update-checks";
import type { ToolModule } from "./types";

const WINGET_ID = "RubyInstallerTeam.Ruby.3.3";

const PACKAGES = { apt: "ruby", dnf: "ruby", pacman: "ruby", zypper: "ruby" };

export const rubyTool: ToolModule = {
  name: "ruby",
  displayName: "Ruby",
  category: "system",

  probe: () => probe("ruby"),

  install() {
    if (process.platform === "darwin") return { command: "brew install ruby" };
    if (process.platform === "win32") return { command: wingetCommand(WINGET_ID, "install") };

    const command = linuxPackageCommand(PACKAGES, "install");
    return command ? { command } : null;
  },

  update() {
    if (process.platform === "darwin") return "brew upgrade ruby";
    if (process.platform === "win32") return wingetCommand(WINGET_ID, "upgrade");

    return linuxPackageCommand(PACKAGES, "upgrade");
  },

  checkUpdate: () => brewOutdated("ruby")
};
