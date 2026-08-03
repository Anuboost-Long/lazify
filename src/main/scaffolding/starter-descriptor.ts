import fs from "node:fs/promises";
import path from "node:path";

/**
 * One declared replacement. `token` swaps a literal string inside a text file;
 * `jsonPath` sets a dot-separated key in a JSON file. Deliberately only those
 * two: the moment substitutions grow conditionals, the blueprint constants have
 * been rebuilt in JSON.
 */
export interface StarterSubstitution {
  file: string;
  token?: string;
  jsonPath?: string;
  value: string;
}

export interface StarterOptionalFolder {
  path: string;
  label: string;
}

export interface StarterDescriptor {
  substitutions: StarterSubstitution[];
  optionalFolders: StarterOptionalFolder[];
  /**
   * The inverse of a manifest: a short list of what the picker may not remove.
   * Everything else is removable, so a file added to the starter next month
   * shows up on its own with nothing here to update.
   */
  required: string[];
  /** Starter scaffolding that must not survive into the user's project. */
  excludeFromCopy: string[];
}

export const STARTER_DESCRIPTOR_FILE = "starter.json";

/** A starter that declares nothing still has to scaffold. */
function defaultDescriptor(): StarterDescriptor {
  return { substitutions: [], optionalFolders: [], required: [], excludeFromCopy: [] };
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function substitutions(value: unknown): StarterSubstitution[] {
  if (!Array.isArray(value)) {
    return [];
  }

  // A substitution naming neither a token nor a JSON key cannot do anything, so
  // it is dropped rather than carried as a silent no-op.
  return value.filter(
    (entry): entry is StarterSubstitution =>
      typeof entry?.file === "string" &&
      typeof entry?.value === "string" &&
      (typeof entry?.token === "string" || typeof entry?.jsonPath === "string")
  );
}

function optionalFolders(value: unknown): StarterOptionalFolder[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is StarterOptionalFolder =>
      typeof entry?.path === "string" && typeof entry?.label === "string"
  );
}

/**
 * Reads a starter's self-description. The file is optional by design, and a
 * malformed one falls back to the same defaults: a stray comma in an optional
 * file should not be able to stop a project from being created.
 */
export async function readStarterDescriptor(starterPath: string): Promise<StarterDescriptor> {
  let raw: string;

  try {
    raw = await fs.readFile(path.join(starterPath, STARTER_DESCRIPTOR_FILE), "utf8");
  } catch {
    return defaultDescriptor();
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    return {
      substitutions: substitutions(parsed.substitutions),
      optionalFolders: optionalFolders(parsed.optionalFolders),
      required: stringList(parsed.required),
      excludeFromCopy: stringList(parsed.excludeFromCopy)
    };
  } catch {
    console.warn(`Ignoring malformed ${STARTER_DESCRIPTOR_FILE} in ${starterPath}.`);
    return defaultDescriptor();
  }
}
