import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { loginShell } from "./login-shell";
import { findTool } from "./tools";
import { nvmPrefix } from "./tools/nvm-shell";
import { CANNOT_CHECK, type ToolCommand, type ToolModule, type ToolUpdateInfo } from "./tools/types";

const execFileAsync = promisify(execFile);

export interface NvmActionResult {
  success: boolean;
  output: string;
}

/** How long an install is given before it is assumed to be stuck. */
const ACTION_TIMEOUT_MS = 120_000;

/**
 * Runs one tool action and reports what the shell said, successful or not.
 *
 * The output is the point: these are package-manager commands with their own
 * opinions about what went wrong, and a modal that only said "failed" would
 * throw away the one thing that explains it.
 */
async function runAction(
  tool: ToolModule,
  action: "install" | "update" | "uninstall",
  command: string
): Promise<NvmActionResult> {
  const prefix = tool.nvmActions?.includes(action) ? nvmPrefix() : "";

  try {
    const { stdout, stderr } = await execFileAsync(...loginShell(`${prefix}${command}`), {
      timeout: ACTION_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024
    });
    return { success: true, output: [stdout, stderr].filter(Boolean).join("\n").trim() };
  } catch (err) {
    return { success: false, output: err instanceof Error ? err.message : String(err) };
  }
}

function missing(what: string): NvmActionResult {
  return { success: false, output: what };
}

export async function installTool(toolName: string): Promise<NvmActionResult> {
  const tool = findTool(toolName);
  const info: ToolCommand | null = tool?.install?.() ?? null;
  if (!tool || !info) return missing("No install method available for this tool on your platform.");

  return runAction(tool, "install", info.command);
}

export async function updateTool(toolName: string): Promise<NvmActionResult> {
  const tool = findTool(toolName);
  const command = tool?.update?.() ?? null;
  if (!tool || !command) return missing("No update method available for this tool on your platform.");

  return runAction(tool, "update", command);
}

/**
 * Takes an agent CLI back off the machine. Only tools that answer `uninstall`
 * can be removed, so this cannot be pointed at a toolchain.
 */
export async function uninstallTool(toolName: string): Promise<NvmActionResult> {
  const tool = findTool(toolName);
  const info: ToolCommand | null = tool?.uninstall?.() ?? null;
  if (!tool || !info) return missing("This tool cannot be uninstalled from Lazify.");

  return runAction(tool, "uninstall", info.command);
}

export async function checkToolUpdate(
  toolName: string,
  currentVersion: string
): Promise<ToolUpdateInfo> {
  const tool = findTool(toolName);
  if (!tool?.checkUpdate) return CANNOT_CHECK;

  return tool.checkUpdate(currentVersion);
}
