import fs from "node:fs/promises";
import path from "node:path";

const ROOT_MARKERS = [
  "package.json",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "bun.lock",
  "vite.config.js",
  "vite.config.ts",
  "vite.config.mjs",
  "next.config.js",
  "next.config.ts",
  "next.config.mjs",
  "app.json",
  "app.config.js",
  "app.config.ts",
  "expo-env.d.ts",
  "metro.config.js",
  "babel.config.js",
  "electron-builder.json",
  "main.js",
  "main.ts",
];

const ROOT_DIR_MARKERS = ["android", "ios", "src", "app", "pages", "electron"];

export interface RootFileDetector {
  names: Set<string>;
  hasFile: (name: string) => boolean;
  hasFolder: (name: string) => boolean;
  hasPathContaining: (value: string) => boolean;
}

export async function createRootFileDetector(projectRoot: string): Promise<RootFileDetector> {
  const names = new Set<string>();

  for (const entryName of [...ROOT_MARKERS, ...ROOT_DIR_MARKERS]) {
    try {
      await fs.stat(path.join(projectRoot, entryName));
      names.add(entryName);
    } catch {
      continue;
    }
  }

  return {
    names,
    hasFile: (name: string) => names.has(name),
    hasFolder: (name: string) => names.has(name),
    hasPathContaining: (value: string) =>
      Array.from(names).some((entryName) => entryName.toLowerCase().includes(value.toLowerCase())),
  };
}
