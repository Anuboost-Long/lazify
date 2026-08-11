import { useRef, useState } from "react";

import type { ImportedProjectIndexNode } from "@renderer/shared/types/lazify";
import { resolvePrintedProjectPath } from "../utils/paths";

export interface LinkedTerminalFile {
  node: ImportedProjectIndexNode;
  line: number | null;
}

export function useTerminalLinks(projectPath: string) {
  const [linkedFile, setLinkedFile] = useState<LinkedTerminalFile | null>(null);
  const resolvedRef = useRef(new Map<string, string>());

  const resolveFilePath = async (printedPath: string) => {
    if (!projectPath) return null;

    const cacheKey = `${projectPath}\0${printedPath}`;
    const cached = resolvedRef.current.get(cacheKey);
    if (cached) return cached;

    const absolutePath = resolvePrintedProjectPath(projectPath, printedPath);
    if (!absolutePath) return null;

    try {
      await globalThis.lazify.readImportedProjectFile(absolutePath);
    } catch {
      return null;
    }

    resolvedRef.current.set(cacheKey, absolutePath);
    return absolutePath;
  };

  const openFilePath = (absolutePath: string, line: number | null) => {
    setLinkedFile({
      node: {
        id: `terminal-link-${absolutePath}`,
        name: absolutePath.slice(absolutePath.lastIndexOf("/") + 1),
        type: "file",
        relativePath: absolutePath.startsWith(`${projectPath}/`)
          ? absolutePath.slice(projectPath.length + 1)
          : absolutePath,
        absolutePath,
        children: [],
      },
      line,
    });
  };

  return {
    linkedFile,
    closeFile: () => setLinkedFile(null),
    resolveFilePath,
    openFilePath,
  };
}
