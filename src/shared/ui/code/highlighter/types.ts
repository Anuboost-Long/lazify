/**
 * The contract between the highlighting engine and the components that paint
 * it. Nothing here mentions Shiki, so the engine stays replaceable.
 */

/**
 * One coloured run of text. Colours are resolved hex, not CSS variables.
 * `content` rather than `text` so the engine's own tokens satisfy this shape
 * directly and a document never has to be copied to be painted.
 */
export interface HighlightToken {
  content: string;
  color?: string;
  /** TextMate bit flags: 1 italic, 2 bold, 4 underline, 8 strikethrough. */
  fontStyle?: number;
}

export type HighlightLine = HighlightToken[];

/** Where an asset came from, so the picker can label user drop-ins. */
export type AssetSource = "bundled" | "user";

export interface ThemeOption {
  id: string;
  label: string;
  type: "light" | "dark";
  source: AssetSource;
}

export interface LanguageOption {
  id: string;
  label: string;
  source: AssetSource;
}

/** The editor colours a theme carries alongside its token rules. */
export interface ThemePalette {
  fg: string;
  bg: string;
}

/** Raw JSON pulled off disk by the main process. */
export interface UserThemeAsset {
  id: string;
  displayName: string;
  type: "light" | "dark";
  data: unknown;
}

export interface UserLanguageAsset {
  id: string;
  displayName: string;
  /** Extensions the grammar claims via `fileTypes`, without leading dots. */
  fileTypes: string[];
  data: unknown;
}

export interface HighlightingAssets {
  themes: UserThemeAsset[];
  languages: UserLanguageAsset[];
  /** Extension -> language id overrides from `extensions.json`. */
  extensions: Record<string, string>;
  /** Absolute path of the folder, so the UI can tell the user where to look. */
  directory: string;
}
