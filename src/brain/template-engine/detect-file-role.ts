import path from "node:path";

import type { FileRole } from "./types";

export function detectFileRole(filePath: string): FileRole {
  const normalizedPath = filePath.replace(/\\/g, "/").toLowerCase();
  const name = path.posix.basename(normalizedPath);
  const extension = path.posix.extname(normalizedPath);

  if (name === "index.tsx" || name === "index.jsx" || name === "_layout.tsx") {
    return "entry-point";
  }

  if (name.includes("config")) {
    return "config";
  }

  if (normalizedPath.includes("api")) {
    return "api";
  }

  if (normalizedPath.includes("hooks") || name.startsWith("use")) {
    return "hook";
  }

  if (normalizedPath.includes("types") || extension === ".d.ts") {
    return "type";
  }

  if (normalizedPath.includes("components")) {
    return "ui";
  }

  if (normalizedPath.includes("assets")) {
    return "asset";
  }

  if (normalizedPath.includes("navigation") || normalizedPath.includes("router")) {
    return "navigation";
  }

  if (normalizedPath.includes("store") || normalizedPath.includes("jotai") || normalizedPath.includes("redux")) {
    return "state";
  }

  if (normalizedPath.includes("services")) {
    return "service";
  }

  if (extension === ".css" || extension === ".scss") {
    return "style";
  }

  return "unknown";
}
