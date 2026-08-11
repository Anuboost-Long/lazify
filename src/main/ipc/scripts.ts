import { ipcMain } from "electron";
import fs from "node:fs";
import path from "node:path";
import { resolveDevPortInjection } from "../environment/dev-port";
import { isDotnetScript, listDotnetScripts, resolveDotnetLaunch, waitForDotnetPortsFree } from "../environment/dotnet-runner";
import { buildProcessTree, getDescendantPids, scanListeningPorts } from "../environment/environment-scanner";
import { choosePackageManager } from "../environment/scanner";
import type { IpcContext } from "./context";

export function registerScriptHandlers(ctx: IpcContext) {
  ipcMain.handle("lazify:list-scripts", async (_event, projectPath: string): Promise<Record<string, string>> => {
    // A .NET project has no scripts of its own, so synthesised `dotnet:*` ones
    // are offered alongside whatever package.json provides.
    const dotnetScripts = await listDotnetScripts(projectPath);
    const pkgJsonPath = path.join(projectPath, "package.json");
    if (!fs.existsSync(pkgJsonPath)) return dotnetScripts;
    const raw = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8")) as Record<string, unknown>;
    return { ...((raw.scripts ?? {}) as Record<string, string>), ...dotnetScripts };
  });

  const launchScript = async (projectPath: string, scriptName: string, cols: number, rows: number): Promise<{ runId: string; ptyAvailable: boolean }> => {
    const dotnetLaunch = await resolveDotnetLaunch(projectPath, scriptName);
    const packageManager = choosePackageManager(projectPath);
    // If this dev script's port is already taken, step up to the next free one.
    // The dotnet CLI takes neither the flag nor PORT, so it opts out.
    const { extraArgs, env } = dotnetLaunch
      ? { extraArgs: [] as string[], env: {} as Record<string, string> }
      : await resolveDevPortInjection(projectPath, scriptName, packageManager);
    const command = dotnetLaunch?.command ?? packageManager;
    const args = dotnetLaunch
      ? dotnetLaunch.args
      : [...(packageManager === "yarn" ? [scriptName] : ["run", scriptName]), ...extraArgs];

    if (ctx.ptyRunner.available) {
      const runId = ctx.ptyRunner.start(command, args, projectPath, scriptName, cols as number, rows as number, env);
      return { runId, ptyAvailable: true };
    }

    // Fallback: spawn without PTY (no interactive output)
    const runId = ctx.commandRunner.startScript(
      { command, args, cwd: projectPath, env },
      (event) => ctx.emitToRenderer("lazify:pty-data", { runId: event.id, data: event.message }),
      (id, exitCode) => ctx.emitToRenderer("lazify:script-status", { runId: id, scriptName, exitCode, status: exitCode === 0 ? "done" : "error" })
    );
    ctx.emitToRenderer("lazify:script-status", { runId, scriptName, exitCode: null, status: "running" });
    return { runId, ptyAvailable: false };
  };

  ipcMain.handle("lazify:run-script", async (_event, projectPath: string, scriptName: string, cols = 220, rows = 50) =>
    launchScript(projectPath, scriptName, cols as number, rows as number)
  );

  ipcMain.handle("lazify:stop-script", async (_event, runId: string): Promise<void> => {
    if (runId.startsWith("pty-")) {
      ctx.ptyRunner.kill(runId);
      // An explicit kill — from the sessions pane, a closed tab, or Stop — should
      // take the agent-pane tab with it, unlike a process that exits on its own
      // (whose tab is kept so its final output can be read).
      ctx.emitToRenderer("lazify:session-killed", { runId });
    } else {
      ctx.commandRunner.stopScript(runId);
    }
  });

  /**
   * Stop-then-start as one call. Done in main rather than the renderer so the
   * relaunch waits for the old process to actually exit — otherwise a dev
   * server restart races its predecessor for the port.
   */
  ipcMain.handle(
    "lazify:restart-script",
    async (_event, runId: string, projectPath: string, scriptName: string, cols = 220, rows = 50): Promise<{ runId: string; ptyAvailable: boolean }> => {
      if (runId.startsWith("pty-")) {
        await ctx.ptyRunner.killAndWait(runId);
      } else {
        ctx.commandRunner.stopScript(runId);
      }

      // Kestrel's listener can outlive the process it belonged to; rebinding in
      // that window is exactly what "address already in use" is.
      if (isDotnetScript(scriptName)) {
        await waitForDotnetPortsFree(projectPath);
      }

      return launchScript(projectPath, scriptName, cols as number, rows as number);
    }
  );

  ipcMain.handle("lazify:list-sessions", async () => {
    const sessions = ctx.ptyRunner.getSessions();
    if (sessions.length === 0) return [];

    const [ports, tree] = await Promise.all([scanListeningPorts(), buildProcessTree()]);

    return sessions.map((s) => {
      const descendants = getDescendantPids(s.pid, tree);
      const sessionPorts = ports
        .filter((p) => descendants.has(p.pid))
        .map((p) => ({ port: p.port, command: p.command, address: p.address }));
      return {
        ...s,
        ports: sessionPorts,
        waiting: ctx.attentionDetector.isWaiting(s.runId),
        // Only agent runs are tracked, so this doubles as "is this an agent".
        isAgent: ctx.attentionDetector.isTracked(s.runId)
      };
    });
  });

  // Fire-and-forget — no invoke/handle round-trip needed for input
  ipcMain.on("lazify:pty-write", (_event, runId: string, data: string) => {
    // Submitting (Enter) is what answers a waiting prompt. Navigating a menu
    // with arrow keys leaves it still waiting, so clearing on every keystroke
    // would drop the badge and then re-fire it on the menu's next redraw.
    if (/[\r\n]/.test(data) && ctx.attentionDetector.clear(runId)) {
      ctx.emitAttention(runId, false);
    }

    ctx.ptyRunner.write(runId, data);
  });

  ipcMain.handle("lazify:pty-backlog", async (_event, runId: string) => ctx.ptyRunner.getBacklog(runId));

  ipcMain.on("lazify:pty-resize", (_event, runId: string, cols: number, rows: number) => {
    ctx.ptyRunner.resize(runId, cols, rows);
  });
}
