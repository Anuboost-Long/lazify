import type { FolderRole } from "./types";

export function detectFolderRole(folderPath: string): FolderRole {
  const normalizedPath = folderPath.replace(/\\/g, "/").toLowerCase();

  if (normalizedPath.includes("api")) {
    return "data-layer";
  }

  if (normalizedPath.includes("components")) {
    return "shared-ui";
  }

  if (normalizedPath === "app" || normalizedPath.startsWith("app/")) {
    return "ui-layer";
  }

  if (normalizedPath === "src" || normalizedPath.startsWith("src/")) {
    return "ui-layer";
  }

  if (normalizedPath.includes("assets")) {
    return "static";
  }

  if (normalizedPath.includes("types") || normalizedPath.includes("@types")) {
    return "types";
  }

  if (normalizedPath.includes("navigation") || normalizedPath.includes("router")) {
    return "navigation";
  }

  if (normalizedPath.includes("store") || normalizedPath.includes("jotai") || normalizedPath.includes("redux")) {
    return "state";
  }

  if (normalizedPath.includes("services")) {
    return "services";
  }

  if (normalizedPath.includes("config")) {
    return "config";
  }

  return "unknown";
}
