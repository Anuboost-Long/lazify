import { ipcMain } from "electron";
import { setAgentBudget } from "../agents/agent-limits-store";
import { getAgentDefinition, listAgents, resumeArgs } from "../agents/agent-registry";
import { listAgentSessions } from "../agents/agent-sessions";
import { getAgentUsage } from "../agents/agent-usage";
import { Autopilot } from "../agents/autopilot";
import { getAutopilotSettings, setAutopilotEnabled, setAutopilotProject } from "../agents/autopilot-store";
import { saveClipboardImageToTempFile } from "../agents/clipboard-image";
import { addCustomAgent, removeCustomAgent } from "../agents/custom-agents-store";
import type { CustomAgentInput } from "../agents/custom-agents-store";
import type { IpcContext } from "./context";
import { hideRun } from "../agents/hidden-runs";

export function registerAgentHandlers(ctx: IpcContext) {
  // Pasting into a PTY only ever forwards text, so a clipboard screenshot
  // (no text representation) would otherwise vanish silently on paste.
  ipcMain.handle("lazify:save-clipboard-image", () => saveClipboardImageToTempFile());

  ipcMain.handle("lazify:list-agents", async () => listAgents());

  // Past conversations for this project, so one can be resumed rather than
  // started from nothing.
  ipcMain.handle("lazify:list-agent-sessions", async (_event, projectPath: string) =>
    listAgentSessions(projectPath)
  );

  ipcMain.handle("lazify:add-custom-agent", async (_event, input: CustomAgentInput) =>
    addCustomAgent(input)
  );

  ipcMain.handle(
    "lazify:agent-usage",
    async (_event, sinceIso?: string, agentIds?: string[]) =>
      getAgentUsage(sinceIso, agentIds)
  );

  ipcMain.handle(
    "lazify:set-agent-budget",
    async (_event, agentId: string, weeklyTokens: number) =>
      setAgentBudget(agentId, weeklyTokens)
  );

  ipcMain.handle("lazify:remove-custom-agent", async (_event, agentId: string) =>
    removeCustomAgent(agentId)
  );

  // Autopilot's switches. Read on every prompt rather than cached, so turning it
  // off stops the very next answer instead of the next launch.
  ipcMain.handle("lazify:autopilot-settings", async () => getAutopilotSettings());

  ipcMain.handle("lazify:set-autopilot", async (_event, enabled: boolean) =>
    setAutopilotEnabled(enabled)
  );

  ipcMain.handle(
    "lazify:set-autopilot-project",
    async (_event, projectPath: string, enabled: boolean) =>
      setAutopilotProject(projectPath, enabled)
  );

  // Agents are plain interactive CLIs: run them in a PTY and let xterm render.
  // Input, resize, and teardown reuse the existing pty-write/resize/stop-script channels.
  ipcMain.handle(
    "lazify:open-agent-terminal",
    async (
      _event,
      agentId: string,
      projectPath: string,
      cols = 120,
      rows = 30,
      resumeSessionId?: string,
      hidden = false
    ): Promise<{ runId: string }> => {
      const definition = getAgentDefinition(agentId);

      if (!definition) {
        throw new Error(`Unknown agent: ${agentId}`);
      }

      if (!ctx.ptyRunner.available) {
        throw new Error("node-pty is not available. Run: npm run rebuild");
      }

      // Resuming is the same launch with the CLI's own flag appended; an agent
      // that has no such flag simply starts fresh.
      const resume = resumeSessionId ? resumeArgs(agentId, resumeSessionId) : null;

      const runId = ctx.ptyRunner.start(
        definition.binary,
        resume ? [...definition.args, ...resume] : definition.args,
        projectPath,
        definition.label,
        cols as number,
        rows as number
      );

      // Only agent sessions are watched for prompts — a dev server's output is
      // not a permission request, however much it looks like one.
      ctx.attentionDetector.track(runId);

      // A run owned by one screen: it never joins the session lists the rest of
      // the app builds its terminals from.
      if (hidden) hideRun(runId);

      return { runId };
    }
  );
}
