import { probeViaNvm } from "./nvm-shell";
import type { ToolModule } from "./types";

/**
 * Detected only. Node arrives with nvm, an installer or a package manager, and
 * the one of those Lazify drives — nvm — has a pane of its own for it.
 */
export const nodeTool: ToolModule = {
  name: "node",
  displayName: "Node.js",
  category: "nodejs",
  probe: () => probeViaNvm("node")
};
