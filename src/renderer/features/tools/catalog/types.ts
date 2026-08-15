import type { UiIconName } from "@renderer/shared/ui/icons/UiIcon";

export interface ToolDefinition {
  id: string;
  path: string;
  /** Translation keys — the grid calls t() itself. */
  label: string;
  description: string;
  icon: UiIconName;
  /**
   * The tool's own hue, as a hex colour.
   *
   * Applied as a wash over the tile rather than a solid fill, so one set of
   * colours works on both themes: the same hue reads as pastel on light and
   * deep on dark, and the text on top keeps the app's own contrast.
   */
  color: string;
  /** Only offered on macOS — the tool needs something no other OS has. */
  macOnly?: boolean;
}

/** Alpha suffixes for the one hue a tool owns. */
export const TOOL_TILE_ALPHA = "1a";
export const TOOL_BORDER_ALPHA = "40";
export const TOOL_ICON_ALPHA = "33";
