import type { CSSProperties } from "react";

import { TOOL_BORDER_ALPHA, TOOL_ICON_ALPHA, TOOL_TILE_ALPHA, type ToolDefinition } from "../catalog";

/**
 * A tool's hue, handed to CSS as variables rather than inline colours.
 *
 * Inline styles beat every class, so a tile painted inline could never be given
 * a hover state. As variables the colours stay the tool's own and the hover
 * rule still wins.
 */
export function toolColorVars(tool: ToolDefinition): CSSProperties {
  return {
    "--tool": tool.color,
    "--tool-tile": `${tool.color}${TOOL_TILE_ALPHA}`,
    "--tool-border": `${tool.color}${TOOL_BORDER_ALPHA}`,
    "--tool-icon": `${tool.color}${TOOL_ICON_ALPHA}`
  } as CSSProperties;
}
