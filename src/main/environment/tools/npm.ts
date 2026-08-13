import { probeViaNvm } from "./nvm-shell";
import { npmViewUpdate } from "./update-checks";
import type { ToolModule } from "./types";

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
