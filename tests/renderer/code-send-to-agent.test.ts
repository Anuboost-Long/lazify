// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import {
  buildCodePayload,
  formatCodeReference
} from "../../src/renderer/features/agents/utils/code-payload";
import type { CodeSelectionContext } from "../../src/renderer/shared/ui/code/menu/code-selection";

const PROJECT = "/Users/dev/lazify";

function selection(over: Partial<CodeSelectionContext> = {}): CodeSelectionContext {
  return {
    text: "const answer = 42;",
    startLine: 12,
    endLine: 12,
    filePath: `${PROJECT}/src/app.ts`,
    fileName: "app.ts",
    ...over
  };
}

describe("formatCodeReference", () => {
  it("makes the path relative to the project", () => {
    expect(formatCodeReference(selection(), PROJECT)).toBe("src/app.ts:12");
  });

  it("keeps a path from outside the project absolute", () => {
    const outside = selection({ filePath: "/etc/hosts", fileName: "hosts" });

    expect(formatCodeReference(outside, PROJECT)).toBe("/etc/hosts:12");
  });

  it("writes a range only when the passage spans lines", () => {
    expect(formatCodeReference(selection({ endLine: 40 }), PROJECT)).toBe("src/app.ts:12-40");
  });

  it("falls back to the file name when there is no path", () => {
    const nameOnly = selection({ filePath: null });

    expect(formatCodeReference(nameOnly, PROJECT)).toBe("app.ts:12");
  });
});

describe("buildCodePayload", () => {
  it("sends plain text, leaving escapes to the terminal that pastes it", () => {
    const payload = buildCodePayload(selection());

    expect(payload).not.toContain("\u001b");
    expect(payload.endsWith("```")).toBe(true);
  });

  it("carries the full path so the agent can open it without guessing", () => {
    const payload = buildCodePayload(selection());

    expect(payload).toContain(`${PROJECT}/src/app.ts:12`);
    expect(payload.startsWith("/")).toBe(true);
    expect(payload).toContain("```ts");
    expect(payload).toContain("const answer = 42;");
  });

  it("keeps the passage's own line breaks intact", () => {
    const multiline = selection({ text: "one\ntwo", endLine: 13 });
    const payload = buildCodePayload(multiline);

    expect(payload).toContain("one\ntwo");
    expect(payload).not.toContain("\r");
  });

  it("maps an extension onto its fence language", () => {
    const python = selection({ fileName: "main.py", filePath: `${PROJECT}/main.py` });

    expect(buildCodePayload(python)).toContain("```python");
  });

  it("omits the reference when the selection has no file at all", () => {
    const loose = selection({ filePath: null, fileName: null });

    expect(buildCodePayload(loose)).toContain("```");
    expect(buildCodePayload(loose)).not.toContain(":12");
  });
});
