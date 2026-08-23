import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ shell: { openPath: vi.fn() } }));

const { editorInvocations } = await import("../../src/main/environment/open-in-editor");

const PROJECT = "/workspace/demo";
const FILE = "/workspace/demo/Controllers/UsersController.cs";

function request(command: string) {
  return { projectPath: PROJECT, filePath: FILE, line: 42, command };
}

describe("handing a file to the user's own editor", () => {
  it("opens the project first, then the file, when the command says nothing about the folder", () => {
    expect(editorInvocations(request("code -g {file}:{line}"))).toEqual([
      { program: "code", args: [PROJECT] },
      { program: "code", args: ["-g", `${FILE}:42`] }
    ]);
  });

  it("leaves the order alone when the command places the folder itself", () => {
    expect(editorInvocations(request("code {folder} -g {file}:{line}"))).toEqual([
      { program: "code", args: [PROJECT, "-g", `${FILE}:42`] }
    ]);
  });

  it("appends the file to a command that never mentions it", () => {
    expect(editorInvocations(request("subl"))).toEqual([
      { program: "subl", args: [PROJECT] },
      { program: "subl", args: [FILE] }
    ]);
  });

  it("keeps a quoted program path in one piece", () => {
    const invocations = editorInvocations(
      request('"/Applications/My Editor.app/Contents/MacOS/cli" --line {line} {file}')
    );

    expect(invocations[1]).toEqual({
      program: "/Applications/My Editor.app/Contents/MacOS/cli",
      args: ["--line", "42", FILE]
    });
  });

  it("falls back to the first line when a route recorded none", () => {
    const [, file] = editorInvocations({ ...request("code -g {file}:{line}"), line: null });

    expect(file.args).toEqual(["-g", `${FILE}:1`]);
  });

  it("leaves the opening to the system when no command is set", () => {
    expect(editorInvocations(request("   "))).toEqual([]);
  });
});
