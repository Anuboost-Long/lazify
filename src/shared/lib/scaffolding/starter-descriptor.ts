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
