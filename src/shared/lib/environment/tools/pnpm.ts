import { probeViaNvm } from "./nvm-shell";
import type { ToolModule } from "./types";
import { npmViewUpdate } from "./update-checks";

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
