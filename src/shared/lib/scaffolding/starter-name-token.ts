import { listFolderTree, readFileBytes, writeTextFile } from "@/platform/folders";
import path from "@/shared/lib/path";

/**
 * Every Lazify starter names its own project this, by convention, so it is a
 * reliable stand-in for the name the user will type. Being an unlikely string
 * rather than a common word is what makes replacing it everywhere safe: there
 * is no plausible false match in a starter's source.
 */
export const STARTER_NAME_TOKEN = "lazify_scaffold";

/** Anything larger is not a file with a project name in it worth rewriting. */
const MAX_FILE_BYTES = 1_000_000;

/** Never walked: not source, and rewriting inside them would be destructive. */
const SKIPPED_DIRECTORIES = [".git", "node_modules", ".next", ".expo", "dist", "build"];

/**
 * A file with a NUL byte in it is not text. Checking the content beats trusting
 * an extension allowlist, which would silently miss whatever a starter adds next.
 */
function isProbablyBinary(contents: Uint8Array): boolean {
  return contents.subarray(0, 8_000).includes(0);
}

async function rewriteFile(filePath: string, projectName: string): Promise<boolean> {
  const contents = await readFileBytes(filePath);

  if (isProbablyBinary(contents)) {
    return false;
  }

  const text = new TextDecoder().decode(contents);

  if (!text.includes(STARTER_NAME_TOKEN)) {
    return false;
  }

  await writeTextFile(filePath, text.split(STARTER_NAME_TOKEN).join(projectName));
  return true;
}

/**
 * Replaces the starter's own name everywhere it appears in the cloned tree.
 *
 * `package.json` is handled as a declared substitution, but the name also turns
 * up in a README, an `app.json`, a manifest, or a config file — and a project
 * still calling itself `lazify_scaffold` in half its files is not the user's
 * project. Returns the files it changed, for the caller to report.
 */
export async function replaceStarterNameToken(
  projectPath: string,
  projectName: string
): Promise<string[]> {
  const changed: string[] = [];

  // A symlink is not followed: it can point outside the project, and a
  // starter has no reason to ship one that needs rewriting.
  for (const entry of await listFolderTree(projectPath, SKIPPED_DIRECTORIES)) {
    if (entry.kind === "file" && entry.size <= MAX_FILE_BYTES && (await rewriteFile(entry.path, projectName))) {
      changed.push(path.relative(projectPath, entry.path));
    }
  }

  return changed;
}
