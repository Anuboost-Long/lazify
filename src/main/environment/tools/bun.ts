import { probeViaNvm } from "./nvm-shell";
import type { ToolModule } from "./types";

/**
 * Bun updates itself and publishes no version endpoint worth polling, so the
 * check reports "there may be one" rather than pretending to know.
 */
export const bunTool: ToolModule = {
  name: "bun",
  displayName: "Bun",
  category: "nodejs",

  probe: () => probeViaNvm("bun"),

  install: () =>
    process.platform === "win32"
      ? { command: 'powershell -c "irm bun.sh/install.ps1 | iex"' }
      : { command: "curl -fsSL https://bun.sh/install | bash" },

  update: () => "bun upgrade",

  checkUpdate: async () => ({ hasUpdate: true, latestVersion: null, canCheck: false })
};
