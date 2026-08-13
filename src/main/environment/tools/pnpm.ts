import { probeViaNvm } from "./nvm-shell";
import { npmViewUpdate } from "./update-checks";
import type { ToolModule } from "./types";

export const pnpmTool: ToolModule = {
  name: "pnpm",
  displayName: "pnpm",
  category: "nodejs",
  nvmActions: ["install", "update"],

  probe: () => probeViaNvm("pnpm"),
  install: () => ({ command: "npm install -g pnpm" }),
  update: () => "npm install -g pnpm",
  checkUpdate: (currentVersion) => npmViewUpdate("pnpm", currentVersion)
};
