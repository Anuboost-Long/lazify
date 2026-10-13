import { host } from "../host";
import { wingetCommand } from "./package-managers";
import { probe } from "./probe";
import type { ToolModule } from "./types";
import { brewOutdated } from "./update-checks";

const WINGET_ID = "Microsoft.DotNet.SDK.8";

/**
 * No Linux install command: the SDK is not in the default repositories on most
 * distros, and the ones that do carry it disagree on the package name per SDK
 * major. Microsoft's own instructions are per-distro, and pointing at them is
 * more use than guessing.
 */
export const dotnetTool: ToolModule = {
  name: "dotnet",
  displayName: ".NET SDK",
  category: "dotnet",

  probe: () => probe("dotnet"),

  install() {
    if (host.platform === "darwin") return { command: "brew install --cask dotnet-sdk" };
    if (host.platform === "win32") return { command: wingetCommand(WINGET_ID, "install") };

    return null;
  },

  update() {
    if (host.platform === "darwin") return "brew upgrade --cask dotnet-sdk";
    if (host.platform === "win32") return wingetCommand(WINGET_ID, "upgrade");

    return null;
  },

  checkUpdate: () => brewOutdated("dotnet-sdk")
};
