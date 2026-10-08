/**
 * User-supplied syntax highlighting assets.
 *
 * The folder is a drop-in point: any VS Code theme JSON in `themes/` and any
 * `.tmLanguage.json` grammar in `languages/` is picked up on launch, with no
 * rebuild. `extensions.json` retargets file extensions at whatever grammar the
 * user prefers. Nothing here parses the assets — the renderer's Shiki engine
 * owns that — so a malformed file costs one skipped entry, not a crash.
 */

export interface UserThemeAsset {
  id: string;
  displayName: string;
  type: "light" | "dark";
  data: unknown;
}

export interface UserLanguageAsset {
  id: string;
  displayName: string;
  fileTypes: string[];
  data: unknown;
}

export interface HighlightingAssets {
  themes: UserThemeAsset[];
  languages: UserLanguageAsset[];
  extensions: Record<string, string>;
  directory: string;
}
