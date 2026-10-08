import type { ProjectReader } from "./project-reader";

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
  "vite.config.mts",
  "vite.config.cts",
  "index.html",
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

export async function createRootFileDetector(project: ProjectReader): Promise<RootFileDetector> {
  const names = new Set<string>();

  for (const entryName of [...ROOT_MARKERS, ...ROOT_DIR_MARKERS]) {
    try {
      if (await project.exists(entryName)) names.add(entryName);
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
