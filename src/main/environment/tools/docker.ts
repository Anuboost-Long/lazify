import { linuxPackageCommand, wingetCommand } from "./package-managers";
import { probe } from "./probe";
import { brewOutdated } from "./update-checks";
import type { ToolModule } from "./types";

const WINGET_ID = "Docker.DockerDesktop";

const PACKAGES = { apt: "docker.io", dnf: "docker", pacman: "docker", zypper: "docker" };

export const dockerTool: ToolModule = {
  name: "docker",
  displayName: "Docker",
  category: "system",

  probe: () => probe("docker"),

  install() {
    if (process.platform === "darwin") {
      return { command: "brew install --cask docker", note: "Launch Docker Desktop after installation." };
    }

    if (process.platform === "win32") {
      return { command: wingetCommand(WINGET_ID, "install"), note: "Launch Docker Desktop after installation." };
    }

    // On Linux the package is the daemon, not a desktop app: it needs starting,
    // and the user needs to be in the docker group before the CLI answers.
    const command = linuxPackageCommand(PACKAGES, "install");
    return command
      ? { command, note: "Then: enable the service and add yourself to the docker group." }
      : null;
  },

  update() {
    if (process.platform === "darwin") return "brew upgrade --cask docker";
    if (process.platform === "win32") return wingetCommand(WINGET_ID, "upgrade");

    return linuxPackageCommand(PACKAGES, "upgrade");
  },

  checkUpdate: () => brewOutdated("docker")
};
