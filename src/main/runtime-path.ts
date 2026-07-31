import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";

let normalized = false;

function readShellPath(): string[] {
  if (process.platform === "win32") {
    return [];
  }

  const shell =
    process.env.SHELL ||
    (process.platform === "darwin" ? "/bin/zsh" : "/bin/bash");
  const result = spawnSync(
    shell,
    ["-lic", 'printf "\\nLAZIFY_PATH:%s\\n" "$PATH"'],
    {
      encoding: "utf8",
      timeout: 4000,
    }
  );

  const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
  const match = output.match(/LAZIFY_PATH:(.+)/);
  return match?.[1] ? match[1].split(path.delimiter) : [];
}

export function normalizeRuntimePath(): void {
  if (normalized) {
    return;
  }

  normalized = true;

  if (process.platform === "win32") {
    return;
  }

  const home = homedir();
  const commonPaths = [
    "/opt/homebrew/bin",
    "/opt/homebrew/sbin",
    "/usr/local/bin",
    "/usr/local/sbin",
    "/usr/local/share/dotnet",
    path.join(home, ".dotnet", "tools"),
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
  ];
  const currentPaths = (process.env.PATH ?? "").split(path.delimiter);
  const mergedPaths = [
    ...readShellPath(),
    ...commonPaths,
    ...currentPaths,
  ].filter(
    (entry, index, entries) => entry && entries.indexOf(entry) === index
  );

  process.env.PATH = mergedPaths.join(path.delimiter);
  process.env.DOTNET_ROOT ??= "/usr/local/share/dotnet";
}
