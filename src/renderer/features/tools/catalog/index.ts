import { dmgCompilerTool } from "./dmg-compiler";
import { environmentTool } from "./environment";
import { promptBuilderTool } from "./prompt-builder";
import type { ToolDefinition } from "./types";

/** Grid order. A new tool is one file and one line here. */
export const TOOLS: ToolDefinition[] = [promptBuilderTool, environmentTool, dmgCompilerTool];

export function availableTools(platform: string): ToolDefinition[] {
  return TOOLS.filter((tool) => !tool.macOnly || platform === "darwin");
}

export { dmgCompilerTool, environmentTool, promptBuilderTool };
export { TOOL_BORDER_ALPHA, TOOL_ICON_ALPHA, TOOL_TILE_ALPHA } from "./types";
export type { ToolDefinition };
