import { probeViaNvm } from "./nvm-shell";
import type { ToolModule } from "./types";

/**
 * The agent CLIs that ship as npm globals.
 *
 * Install, update and uninstall all key off the same package name, so one
 * factory covers the lot rather than four near-identical modules. They live
 * under the nvm-managed node, which is why every action is nvm-scoped: a plain
 * login shell either cannot see the tool or installs a second copy beside it.
 */
function npmAgent(name: string, displayName: string, npmPackage: string): ToolModule {
  return {
    name,
    displayName,
    category: "agents",
    nvmActions: ["install", "update", "uninstall"],

    probe: () => probeViaNvm(name),
    install: () => ({ command: `npm install -g ${npmPackage}` }),
    // Re-installing at @latest is how npm-distributed CLIs update themselves.
    update: () => `npm install -g ${npmPackage}@latest`,
    uninstall: () => ({ command: `npm uninstall -g ${npmPackage}` })
  };
}

export const claudeTool = npmAgent("claude", "Claude Code", "@anthropic-ai/claude-code");
export const codexTool = npmAgent("codex", "Codex", "@openai/codex");
export const geminiTool = npmAgent("gemini", "Gemini CLI", "@google/gemini-cli");
export const copilotTool = npmAgent("copilot", "Copilot CLI", "@github/copilot");

/**
 * Cursor is the exception: it installs from its own script rather than npm,
 * which is also why it cannot be uninstalled from here — nothing tracks what
 * that script put where.
 */
export const cursorTool: ToolModule = {
  name: "cursor-agent",
  displayName: "Cursor",
  category: "agents",
  nvmActions: ["install", "update"],

  probe: () => probeViaNvm("cursor-agent"),

  install() {
    // The installer is a POSIX shell script; there is no Windows equivalent.
    if (process.platform === "win32") return null;

    return {
      command: "curl https://cursor.com/install -fsS | bash",
      note: "Runs Cursor's own installer script, which writes to ~/.local/bin. Removing it again is manual."
    };
  },

  update: () => (process.platform === "win32" ? null : "cursor-agent update")
};
