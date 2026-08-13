import { linuxPackageCommand, wingetCommand } from "./package-managers";
import { probe } from "./probe";
import { brewOutdated } from "./update-checks";
import type { ToolModule } from "./types";

const WINGET_ID = "Git.Git";

const PACKAGES = { apt: "git", dnf: "git", pacman: "git", zypper: "git" };

export const gitTool: ToolModule = {
  name: "git",
  displayName: "Git",
  category: "system",

  probe: () => probe("git"),

  install() {
    if (process.platform === "darwin") return { command: "brew install git" };
    if (process.platform === "win32") return { command: wingetCommand(WINGET_ID, "install") };

    const command = linuxPackageCommand(PACKAGES, "install");
    return command ? { command } : null;
  },

  update() {
    if (process.platform === "darwin") return "brew upgrade git";
    if (process.platform === "win32") return wingetCommand(WINGET_ID, "upgrade");

    return linuxPackageCommand(PACKAGES, "upgrade");
  },

  checkUpdate: () => brewOutdated("git")
};
