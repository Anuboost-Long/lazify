import type { FileNode, FolderNode } from "./types";

export function detectFeatures(files: FileNode[], folders: FolderNode[]): string[] {
  const folderPaths = new Set(folders.map((folder) => folder.path.toLowerCase()));
  const allPaths = new Set([
    ...files.map((file) => file.path.toLowerCase()),
    ...folders.map((folder) => folder.path.toLowerCase()),
  ]);
  const features = new Set<string>();

  const hasFolder = (target: string) =>
    Array.from(folderPaths).some((folderPath) => folderPath === target || folderPath.startsWith(`${target}/`));
  const hasPathContaining = (target: string) =>
    Array.from(allPaths).some((entryPath) => entryPath.includes(target));

  if (hasFolder("api")) {
    features.add("api-layer");
  }

  if (hasFolder("components")) {
    features.add("component-based-ui");
  }

  if (hasPathContaining("app/(tabs)") || hasPathContaining("(tabs)")) {
    features.add("tab-navigation");
  }

  if (hasPathContaining("auth")) {
    features.add("authentication");
  }

  if (hasPathContaining("payment")) {
    features.add("payment-module");
  }

  if (hasPathContaining("i18n") || hasPathContaining("translation")) {
    features.add("localization");
  }

  if (hasPathContaining("jotai")) {
    features.add("jotai-state-management");
  }

  if (hasPathContaining("redux")) {
    features.add("redux-state-management");
  }

  if (hasPathContaining("tailwind")) {
    features.add("tailwind-css");
  }

  return [...features];
}
