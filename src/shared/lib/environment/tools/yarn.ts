import { probeViaNvm } from "./nvm-shell";
import type { ToolModule } from "./types";
import { npmViewUpdate } from "./update-checks";

export const yarnTool: ToolModule = {
  name: "yarn",
  displayName: "Yarn",
  category: "nodejs",
  nvmActions: ["install", "update"],

  probe: () => probeViaNvm("yarn"),
  install: () => ({ command: "npm install -g yarn" }),
  update: () => "npm install -g yarn",
  checkUpdate: (currentVersion) => npmViewUpdate("yarn", currentVersion)
};
