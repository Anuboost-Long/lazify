export const DEFAULT_IGNORED_DIRECTORY_NAMES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".expo",
  ".turbo",
  ".vercel",
  "coverage",
]);

export const DEFAULT_IGNORED_FILE_NAMES = new Set([
  ".DS_Store",
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
]);

export const ENVIRONMENT_FILE_NAMES = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
]);
