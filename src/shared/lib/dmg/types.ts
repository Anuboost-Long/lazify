/** The shapes the DMG compiler exchanges with the renderer. */

/** What a `.app` says about itself, as far as naming the image is concerned. */
export interface AppBundleInfo {
  appPath: string;
  /** Display name: `CFBundleDisplayName`, then `CFBundleName`, then the folder. */
  name: string;
  version: string | null;
  identifier: string | null;
  /** Total bundle size on disk, for the size shown beside the picked app. */
  sizeBytes: number;
  /** `Name-1.2.3.dmg`, or `Name.dmg` when the bundle carries no version. */
  suggestedFileName: string;
  /**
   * The app's own icon as a PNG data URL, or null when it has none this can
   * read.
   *
   * Worth the two extra processes: the icon is how the user recognises the thing
   * they picked. A generic placeholder makes every app look like every other
   * app, and the one mistake this page can make is packaging the wrong one.
   */
  iconDataUrl: string | null;
}

export type DmgStep = "staging" | "styling" | "compressing" | "done";

export interface DmgProgress {
  step: DmgStep;
  /** The path being worked on, so the UI can name what it is waiting for. */
  detail: string;
}

export interface DmgResult {
  success: boolean;
  /** Where the image ended up. Empty when it was never created. */
  outputPath: string;
  sizeBytes: number;
  /** Why it failed, ready to show. Null on success. */
  message: string | null;
  /**
   * A build that worked but came out plainer than asked for — in practice the
   * window layout, which needs permission to script Finder and is the one part
   * of this the user cannot be made to grant from here. The image still mounts
   * and still installs, so this is worth saying rather than worth failing over.
   */
  warning: string | null;
}

export interface CompileDmgOptions {
  appPath: string;
  /** Full path of the `.dmg` to write, extension included. */
  outputPath: string;
  /** Mounted volume name. Defaults to the bundle's display name. */
  volumeName?: string | null;
  /**
   * Artwork drawn behind the two icons, in any format `sips` reads. Its pixel
   * size becomes the window size. Null leaves the window plain.
   */
  backgroundImagePath?: string | null;
  /**
   * The mounted disk's icon, in any format `sips` reads. Null falls back to the
   * app's own icon, which is what the user means nine times in ten.
   */
  volumeIconPath?: string | null;
}
