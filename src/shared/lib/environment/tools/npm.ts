import { probeViaNvm } from "./nvm-shell";
import type { ToolModule } from "./types";
import { npmViewUpdate } from "./update-checks";

/** Ships with Node, so there is nothing to install — only to update. */
export const npmTool: ToolModule = {
  name: "npm",
  displayName: "npm",
  category: "nodejs",
  nvmActions: ["update"],

  probe: () => probeViaNvm("npm"),
  update: () => "npm install -g npm",
  checkUpdate: (currentVersion) => npmViewUpdate("npm", currentVersion)
};
