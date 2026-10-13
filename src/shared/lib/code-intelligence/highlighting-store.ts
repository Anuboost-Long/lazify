import { execFile } from "@/platform/exec";
import { appDataPath, createFolder, listFolder, pathExists, readTextLossy, writeTextFile } from "@/platform/folders";
import path from "@/shared/lib/path";

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

const README = `# Syntax highlighting

Drop files in here and restart Lazify — or hit Reload in Settings > Appearance.

  themes/      VS Code theme JSON (the same files a .vsix ships)
  languages/   TextMate grammars, e.g. rust.tmLanguage.json
  extensions.json   { ".mylang": "rust" } to point an extension at a grammar

The file name becomes the id shown in the theme picker.
`;

async function rootDirectory(): Promise<string> {
  return path.join(await appDataPath(), "highlighting");
}

/** Creates the folder tree on first run so there is somewhere to drop files. */
async function ensureDirectories(): Promise<string> {
  const root = await rootDirectory();

  await createFolder(path.join(root, "themes"));
  await createFolder(path.join(root, "languages"));

  const readme = path.join(root, "README.md");
  if (!(await pathExists(readme))) await writeTextFile(readme, README);

  return root;
}

async function readJsonFiles(directory: string): Promise<{ id: string; data: Record<string, unknown> }[]> {
  let entries: string[];

  try {
    entries = (await listFolder(directory)).map((entry) => entry.name);
  } catch {
    return [];
  }

  const results: { id: string; data: Record<string, unknown> }[] = [];

  for (const entry of entries) {
    if (!entry.toLowerCase().endsWith(".json")) continue;

    try {
      const parsed = JSON.parse(await readTextLossy(path.join(directory, entry))) as unknown;
      if (typeof parsed !== "object" || parsed === null) continue;

      // `rust.tmLanguage.json` and `nord.json` both reduce to their first
      // segment, which is what the user will recognise in the picker.
      const id = entry.slice(0, entry.indexOf(".")).toLowerCase();
      if (id) results.push({ id, data: parsed as Record<string, unknown> });
    } catch {
      // Skip anything unreadable or malformed.
    }
  }

  return results;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * A VS Code theme states its own `type`, but plenty of hand-rolled ones omit
 * it — so fall back to the brightness of the editor background.
 */
function themeType(data: Record<string, unknown>): "light" | "dark" {
  const declared = asString(data.type);
  if (declared === "light" || declared === "dark") return declared;

  const colors = data.colors as Record<string, unknown> | undefined;
  const background = asString(colors?.["editor.background"]);
  const hex = background?.replace("#", "").slice(0, 6);

  if (hex?.length === 6) {
    const value = Number.parseInt(hex, 16);
    const luminance =
      ((value >> 16) & 0xff) * 0.299 + ((value >> 8) & 0xff) * 0.587 + (value & 0xff) * 0.114;

    return luminance > 128 ? "light" : "dark";
  }

  return "dark";
}

async function readExtensionOverrides(root: string): Promise<Record<string, string>> {
  try {
    const parsed = JSON.parse(await readTextLossy(path.join(root, "extensions.json"))) as unknown;

    if (typeof parsed !== "object" || parsed === null) return {};

    const overrides: Record<string, string> = {};

    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") overrides[key] = value;
    }

    return overrides;
  } catch {
    return {};
  }
}

export async function listHighlightingAssets(): Promise<HighlightingAssets> {
  const root = await ensureDirectories();

  const themes = (await readJsonFiles(path.join(root, "themes"))).map(({ id, data }) => ({
    id,
    displayName: asString(data.displayName) ?? asString(data.name) ?? id,
    type: themeType(data),
    data
  }));

  const languages = (await readJsonFiles(path.join(root, "languages"))).map(({ id, data }) => ({
    id,
    displayName: asString(data.displayName) ?? asString(data.name) ?? id,
    fileTypes: Array.isArray(data.fileTypes)
      ? data.fileTypes.filter((type): type is string => typeof type === "string")
      : [],
    data
  }));

  return { themes, languages, extensions: await readExtensionOverrides(root), directory: root };
}

/** Opens the drop-in folder in the OS file manager. */
export async function openHighlightingFolder(): Promise<void> {
  await execFile("open", [await ensureDirectories()]);
}
