/**
 * The installer window, as geometry and as the AppleScript that applies it.
 *
 * Finder owns the mounted window's appearance and the only way to ask is Apple
 * events, so this file produces a script rather than calling anything.
 */

/**
 * The window, when no backdrop sets its size. Wide enough for two 128px icons
 * with room either side, which is the proportion every installer DMG uses.
 */
const DEFAULT_WINDOW = { width: 660, height: 400 };

/** What a backdrop is allowed to stretch the window to, either way. */
const MIN_WINDOW = { width: 420, height: 300 };
const MAX_WINDOW = { width: 1400, height: 900 };

/** Big enough to read as the product, small enough to leave the backdrop room. */
const ICON_SIZE = 128;

export type WindowLayout = ReturnType<typeof windowLayout>;

/**
 * The window the mounted image opens as.
 *
 * A backdrop sets the size, because artwork that is not shown at its own pixel
 * size is artwork with the arrow pointing at the wrong place. It is clamped
 * rather than trusted: a 4000px screenshot dropped in by mistake should give a
 * large window, not one that opens off the edge of the display.
 *
 * The fractions below are mirrored by `WindowPreview` in the renderer — change
 * one and the preview stops matching what the build writes.
 */
export function windowLayout(background: { width: number; height: number } | null) {
  const width = background
    ? Math.min(Math.max(background.width, MIN_WINDOW.width), MAX_WINDOW.width)
    : DEFAULT_WINDOW.width;
  const height = background
    ? Math.min(Math.max(background.height, MIN_WINDOW.height), MAX_WINDOW.height)
    : DEFAULT_WINDOW.height;

  return {
    width,
    height,
    // Finder positions an icon by its centre. Quarter and three-quarter width
    // puts the gap between them in the middle, which is where a backdrop's
    // arrow goes; slightly above centre leaves the labels room.
    appX: Math.round(width * 0.26),
    applicationsX: Math.round(width * 0.74),
    iconY: Math.round(height * 0.46)
  };
}

/** A string AppleScript will read back as the same characters. */
function appleScriptString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * The script that turns a mounted volume into an installer window.
 *
 * Addressed by disk name rather than by path because that is the only handle
 * Finder takes. The trailing close/open/update is not superstition: Finder
 * writes the `.DS_Store` when the window closes, and without reopening it the
 * positions set above can still be sitting in memory when the volume unmounts.
 */
export function layoutScript(
  diskName: string,
  appFileName: string,
  layout: WindowLayout,
  backgroundFileName: string | null
): string {
  const backdrop = backgroundFileName
    ? `    set background picture of viewOptions to file ${appleScriptString(
        `.background:${backgroundFileName}`
      )}\n`
    : "";

  return `tell application "Finder"
  tell disk ${appleScriptString(diskName)}
    open
    set current view of container window to icon view
    set toolbar visible of container window to false
    set statusbar visible of container window to false
    set the bounds of container window to {200, 120, ${200 + layout.width}, ${
      120 + layout.height
    }}
    set viewOptions to the icon view options of container window
    set arrangement of viewOptions to not arranged
    set icon size of viewOptions to ${ICON_SIZE}
    set text size of viewOptions to 12
${backdrop}    set position of item ${appleScriptString(
    appFileName
  )} of container window to {${layout.appX}, ${layout.iconY}}
    set position of item "Applications" of container window to {${layout.applicationsX}, ${
      layout.iconY
    }}
    close
    open
    update without registering applications
    delay 1
  end tell
end tell
`;
}
