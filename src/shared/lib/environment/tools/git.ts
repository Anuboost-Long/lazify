import { host } from "../host";
import { linuxPackageCommand, wingetCommand } from "./package-managers";
import { probe } from "./probe";
import type { ToolModule } from "./types";
import { brewOutdated } from "./update-checks";

const WINGET_ID = "Git.Git";

const PACKAGES = { apt: "git", dnf: "git", pacman: "git", zypper: "git" };

export const gitTool: ToolModule = {
  name: "git",
  displayName: "Git",
  category: "system",

  probe: () => probe("git"),

  install() {
    if (host.platform === "darwin") return { command: "brew install git" };
    if (host.platform === "win32") return { command: wingetCommand(WINGET_ID, "install") };

    const command = linuxPackageCommand(PACKAGES, "install");
    return command ? { command } : null;
  },

  update() {
    if (host.platform === "darwin") return "brew upgrade git";
    if (host.platform === "win32") return wingetCommand(WINGET_ID, "upgrade");

    return linuxPackageCommand(PACKAGES, "upgrade");
  },

  checkUpdate: () => brewOutdated("git")
};
