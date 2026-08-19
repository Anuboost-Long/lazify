import path from "node:path";
import { describe, expect, it } from "vitest";

import { detectEditors, editorCatalog } from "../../src/main/environment/editor-catalog";
import type { EditorProbe } from "../../src/main/environment/editor-catalog";

function probe(present: string[], platform: NodeJS.Platform = "darwin"): EditorProbe {
  return {
    platform,
    pathDirectories: ["/usr/local/bin", "/opt/homebrew/bin"],
    exists: (candidate) => present.includes(candidate)
  };
}

describe("finding the editors a machine has", () => {
  it("finds nothing on a machine that has nothing", () => {
    expect(detectEditors(probe([]))).toEqual([]);
  });

  it("prefers a launcher on PATH over the one an editor ships", () => {
    const [found] = detectEditors(
      probe([
        "/opt/homebrew/bin/code",
        "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
      ])
    );

    expect(found.command).toBe("/opt/homebrew/bin/code {folder} -g {file}:{line}");
  });

  it("falls back to where the editor put its own launcher", () => {
    const [found] = detectEditors(
      probe(["/Applications/Cursor.app/Contents/Resources/app/bin/cursor"])
    );

    expect(found).toMatchObject({ id: "cursor", label: "Cursor" });
    expect(found.command).toContain("{folder} -g {file}:{line}");
  });

  it("quotes a launcher whose path has spaces in it", () => {
    const [found] = detectEditors(
      probe(["/Applications/Sublime Text.app/Contents/SharedSupport/bin/subl"])
    );

    expect(found.command).toBe(
      '"/Applications/Sublime Text.app/Contents/SharedSupport/bin/subl" {folder} {file}:{line}'
    );
  });

  it("reads a Windows launcher by the suffix that machine uses", () => {
    const directory = "C:/bin";
    const found = detectEditors({
      platform: "win32",
      pathDirectories: [directory],
      exists: (candidate) => candidate === path.join(directory, "code.cmd")
    });

    expect(found[0].command).toBe(`${path.join(directory, "code.cmd")} {folder} -g {file}:{line}`);
  });

  it("lists every editor found, not just the first", () => {
    const found = detectEditors(probe(["/usr/local/bin/code", "/usr/local/bin/webstorm"]));

    expect(found.map((editor) => editor.id)).toEqual(["vscode", "webstorm"]);
    expect(found[1].command).toBe("/usr/local/bin/webstorm {folder} --line {line} {file}");
  });

  it("gives every editor in the catalog a folder and a file to open", () => {
    for (const editor of editorCatalog) {
      expect(editor.args).toContain("{folder}");
      expect(editor.args).toContain("{file}");
    }
  });
});
