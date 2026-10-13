import { host } from "../host";
import { linuxPackageCommand, wingetCommand } from "./package-managers";
import { probe } from "./probe";
import type { ToolModule } from "./types";
import { brewOutdated } from "./update-checks";

const WINGET_ID = "GoLang.Go";

// Debian calls it golang-go, Fedora golang, Arch go.
const PACKAGES = { apt: "golang-go", dnf: "golang", pacman: "go", zypper: "go" };

export const goTool: ToolModule = {
  name: "go",
  displayName: "Go",
  category: "system",

  // `go --version` is an error; the subcommand is the only way to ask.
  probe: () => probe("go", ["version"]),

  install() {
    if (host.platform === "darwin") return { command: "brew install go" };
    if (host.platform === "win32") return { command: wingetCommand(WINGET_ID, "install") };

    const command = linuxPackageCommand(PACKAGES, "install");
    return command ? { command } : null;
  },

  update() {
    if (host.platform === "darwin") return "brew upgrade go";
    if (host.platform === "win32") return wingetCommand(WINGET_ID, "upgrade");

    return linuxPackageCommand(PACKAGES, "upgrade");
  },

  checkUpdate: () => brewOutdated("go")
};
