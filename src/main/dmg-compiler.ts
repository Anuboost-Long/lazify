/**
 * Turns a built `.app` into a `.dmg` anyone can install from.
 *
 * Nothing clever, and deliberately no new dependency: macOS ships every tool
 * this needs. `ditto` copies the bundle (the only copy that keeps symlinks,
 * permissions and extended attributes intact — `cp -R` quietly flattens things
 * a signed bundle needs), and `hdiutil` makes the image.
 *
 * The one design choice worth stating is the layout. The image is staged with
 * the app beside an alias to /Applications, which is the drag-to-install window
 * every Mac user already knows how to use. A DMG containing only the bundle
 * would be smaller work and would leave whoever opens it dragging the app to a
 * folder they have to go and find.
 *
 * Making that window *look* like an installer rather than a folder takes a
 * detour: a read-only image cannot be styled, so the build creates a read/write
 * one, mounts it, dresses it, and only then compresses it down to the image that
 * ships. Two things get written while it is mounted:
 *
 *   - the window itself — icon view, no toolbar, fixed size, the two icons
 *     placed and an optional backdrop behind them. Finder owns this, and the
 *     only way to ask is AppleScript, which lands in the volume's `.DS_Store`.
 *   - the volume icon — `.VolumeIcon.icns` plus the `kHasCustomIcon` flag on the
 *     volume root, which is what stops the mounted disk showing up as a generic
 *     white drive.
 *
 * Their order is not a preference. Finder *deletes* `.VolumeIcon.icns` and
 * clears the custom-icon flag while it applies the window layout, so the icon
 * has to be written after the AppleScript pass, never before or in the staged
 * folder. That one is only findable by watching it happen.
 *
 * The parts live in `./dmg`; this file is the entry point the rest of the app
 * imports, so the split stays invisible to `main.ts` and the preload bridge.
 */

export { compileDmg } from "./dmg/compile";
export { readImagePreview } from "./dmg/images";
export { defaultOutputPath, inspectAppBundle } from "./dmg/inspect";
export type {
  AppBundleInfo,
  CompileDmgOptions,
  DmgProgress,
  DmgResult,
  DmgStep
} from "./dmg/types";
