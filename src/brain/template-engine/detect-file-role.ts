import path from "node:path";

import type { FileRole } from "./types";

const DOTNET_PROJECT_EXTENSIONS = new Set([".csproj", ".fsproj", ".vbproj", ".sln", ".slnx", ".props", ".targets"]);
const DOTNET_CODE_EXTENSIONS = new Set([".cs", ".fs", ".vb"]);
const DOTNET_MARKUP_EXTENSIONS = new Set([".razor", ".cshtml", ".vbhtml", ".xaml", ".axaml", ".aspx", ".ascx"]);

/**
 * .NET says what a file is by name and folder, not by extension the way the JS
 * rules below do — `Controllers/UserController.cs` is an API, `Models/User.cs`
 * is a type, and both are plain `.cs`. Returns null for anything that is not a
 * .NET file so the generic rules still decide.
 */
function detectDotnetFileRole(normalizedPath: string, name: string, extension: string): FileRole | null {
  if (DOTNET_PROJECT_EXTENSIONS.has(extension)) {
    return "config";
  }

  if (name === "appsettings.json" || name.startsWith("appsettings.") || name === "launchsettings.json") {
    return "config";
  }

  if (name === "nuget.config" || name === "global.json" || name === "web.config" || name === "app.config") {
    return "config";
  }

  if (normalizedPath.includes("/wwwroot/") || normalizedPath.startsWith("wwwroot/")) {
    return "asset";
  }

  if (DOTNET_MARKUP_EXTENSIONS.has(extension)) {
    return "ui";
  }

  if (!DOTNET_CODE_EXTENSIONS.has(extension)) {
    return null;
  }

  if (name === "program.cs" || name === "startup.cs" || name === "program.fs" || name === "app.xaml.cs") {
    return "entry-point";
  }

  if (name.endsWith("controller.cs") || normalizedPath.includes("/controllers/") || normalizedPath.includes("/endpoints/")) {
    return "api";
  }

  if (name.endsWith("service.cs") || normalizedPath.includes("/services/") || normalizedPath.includes("/handlers/")) {
    return "service";
  }

  if (normalizedPath.includes("/migrations/") || name.endsWith("dbcontext.cs") || normalizedPath.includes("/repositories/")) {
    return "state";
  }

  if (
    normalizedPath.includes("/models/") ||
    normalizedPath.includes("/entities/") ||
    normalizedPath.includes("/dtos/") ||
    normalizedPath.includes("/contracts/") ||
    name.endsWith("dto.cs")
  ) {
    return "type";
  }

  if (normalizedPath.includes("/views/") || normalizedPath.includes("/pages/") || normalizedPath.includes("/components/")) {
    return "ui";
  }

  return "unknown";
}

export function detectFileRole(filePath: string): FileRole {
  const normalizedPath = filePath.replace(/\\/g, "/").toLowerCase();
  const name = path.posix.basename(normalizedPath);
  const extension = path.posix.extname(normalizedPath);

  if (name === "index.tsx" || name === "index.jsx" || name === "_layout.tsx") {
    return "entry-point";
  }

  const dotnetRole = detectDotnetFileRole(normalizedPath, name, extension);
  if (dotnetRole) {
    return dotnetRole;
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
