import { describe, expect, it } from "vitest";

import {
  formatPickedPathsForTerminal,
  resolveAgentProjectPath,
  resolvePrintedProjectPath,
  splitPath
} from "../../src/renderer/features/agents/utils/paths";
import type { SyncedWorkspaceProject } from "../../src/renderer/shared/types/lazify";

function project(projectPath: string): SyncedWorkspaceProject {
  return {
    id: projectPath,
    projectName: projectPath.slice(projectPath.lastIndexOf("/") + 1),
    projectPath,
    stack: "react-vite",
    framework: "react",
    metaFramework: "vite",
    packageManager: "npm",
    confidence: 1,
    lastSyncedAt: "2026-08-03T00:00:00.000Z"
  };
}

describe("Agent page project selection", () => {
  const projects = [project("/workspace/alpha"), project("/workspace/beta")];

  it("restores the remembered project when it is still synced", () => {
    expect(resolveAgentProjectPath(projects, "/workspace/beta")).toBe("/workspace/beta");
  });

  it("falls back to the first project when the remembered project is gone", () => {
    expect(resolveAgentProjectPath(projects, "/workspace/removed")).toBe("/workspace/alpha");
  });

  it("returns an empty path for the no-project state", () => {
    expect(resolveAgentProjectPath([], "/workspace/removed")).toBe("");
  });
});

describe("Agent terminal path handling", () => {
  it("inserts project files as repo-relative paths", () => {
    expect(
      formatPickedPathsForTerminal("/workspace/app", ["/workspace/app/src/App.tsx"])
    ).toBe("src/App.tsx ");
  });

  it("keeps files outside the project absolute", () => {
    expect(formatPickedPathsForTerminal("/workspace/app", ["/tmp/reference.md"])).toBe(
      "/tmp/reference.md "
    );
  });

  it("quotes paths containing spaces and keeps multiple selections separated", () => {
    expect(
      formatPickedPathsForTerminal("/workspace/app", [
        "/workspace/app/src/My File.tsx",
        "/tmp/Other File.md"
      ])
    ).toBe('"src/My File.tsx" "/tmp/Other File.md" ');
  });

  it("resolves relative terminal links against the active project", () => {
    expect(resolvePrintedProjectPath("/workspace/app", "./src/App.tsx")).toBe(
      "/workspace/app/src/App.tsx"
    );
  });

  it("keeps absolute terminal links unchanged", () => {
    expect(resolvePrintedProjectPath("/workspace/app", "/tmp/output.log")).toBe(
      "/tmp/output.log"
    );
  });

  it("does not resolve terminal links without an active project", () => {
    expect(resolvePrintedProjectPath("", "src/App.tsx")).toBeNull();
  });

  it("splits a nested file path for Agent file and change panels", () => {
    expect(splitPath("src/components/Button.tsx")).toEqual({
      directory: "src/components/",
      name: "Button.tsx"
    });
  });
});
