// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CodeSurface } from "../../src/renderer/shared/ui/code/CodeSurface";

afterEach(() => cleanup());

describe("CodeSurface", () => {
  it("uses the highlighted theme layer while editable", () => {
    const onContentChange = vi.fn();
    const { container } = render(
      createElement(CodeSurface, {
        content: "const answer = 42;",
        editable: true,
        fileName: "answer.ts",
        onContentChange
      })
    );

    const textarea = screen.getByRole("textbox");
    const highlightLayer = container.querySelector("[data-editable-highlight]");

    expect(highlightLayer?.textContent).toContain("const answer = 42;");
    expect(textarea.className).toContain("text-transparent");
    fireEvent.change(textarea, { target: { value: "const answer = 43;" } });
    expect(onContentChange).toHaveBeenCalledWith("const answer = 43;");
  });

  it("renders highlighted code without an input while readonly", () => {
    const { container } = render(
      createElement(CodeSurface, {
        content: "const answer = 42;",
        editable: false,
        fileName: "answer.ts"
      })
    );

    expect(screen.queryByRole("textbox")).toBeNull();
    expect(container.querySelector("[data-editable-highlight]")).toBeNull();
    expect(container.textContent).toContain("const answer = 42;");
  });
});
