import { claudeTool, codexTool, copilotTool, cursorTool, geminiTool } from "./agents";
import { bunTool } from "./bun";
import { cargoTool } from "./cargo";
import { dockerTool } from "./docker";
import { dotnetTool } from "./dotnet";
import { gitTool } from "./git";
import { goTool } from "./go";
import { nodeTool } from "./node";
import { npmTool } from "./npm";
import { nvmTool } from "./nvm";
import { pip3Tool } from "./pip3";
import { pnpmTool } from "./pnpm";
import { python3Tool } from "./python3";
import { rubyTool } from "./ruby";
import { yarnTool } from "./yarn";
import type { ToolModule } from "./types";

/** Every tool the environment pane knows, in the order it lists them. */
export const TOOLS: readonly ToolModule[] = [
  nodeTool,
  nvmTool,
  npmTool,
  yarnTool,
  pnpmTool,
  bunTool,
  python3Tool,
  pip3Tool,
  dotnetTool,
  goTool,
  cargoTool,
  rubyTool,
  gitTool,
  dockerTool,
  claudeTool,
  codexTool,
  geminiTool,
  copilotTool,
  cursorTool
];

export function findTool(name: string): ToolModule | null {
  return TOOLS.find((tool) => tool.name === name) ?? null;
}

export type { ToolModule };
