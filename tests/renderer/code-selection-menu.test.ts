// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { CodeSurface } from "../../src/renderer/shared/ui/code/CodeSurface";
import { CodeSelectionActionsProvider } from "../../src/renderer/shared/ui/code/menu/selection-actions";
import type { CodeSelectionContext } from "../../src/renderer/shared/ui/code/menu/code-selection";

const FILE = "const answer = 42;\nconst other = answer;\nexport { answer };";

beforeAll(() => {
  Element.prototype.getClientRects = () => [{}] as unknown as DOMRectList;
});

afterEach(() => {
  cleanup();
  globalThis.getSelection()?.removeAllRanges();
});

function lines(container: HTMLElement) {
  return [...container.querySelectorAll("[data-code-line]")];
}

function highlight(container: HTMLElement, from: number, to: number) {
  const painted = lines(container);
  const range = document.createRange();

  range.setStart(painted[from], 0);
  range.setEnd(painted[to], painted[to].childNodes.length);

  const selection = globalThis.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function renderSurface(actions: Parameters<typeof CodeSelectionActionsProvider>[0]["actions"]) {
  return render(
    createElement(CodeSelectionActionsProvider, {
      actions,
      children: createElement(CodeSurface, {
        content: FILE,
        fileName: "answer.ts",
        filePath: "/repo/answer.ts"
      })
    })
  );
}

describe("right-click menu over a code selection", () => {
  it("offers the actions a surrounding provider declared", () => {
    const { container } = renderSurface([
      { id: "send", label: "Send to agent", onSelect: () => {} }
    ]);

    highlight(container, 0, 0);
    fireEvent.contextMenu(container.querySelector("pre")!);

    expect(screen.getByRole("menuitem", { name: "Send to agent" })).toBeTruthy();
  });

  it("hands the action the highlighted text and the lines it covers", () => {
    const onSelect = vi.fn();
    const { container } = renderSurface([
      { id: "send", label: "Send to agent", onSelect }
    ]);

    highlight(container, 0, 1);
    fireEvent.contextMenu(container.querySelector("pre")!);
    fireEvent.click(screen.getByRole("menuitem", { name: "Send to agent" }));

    const selection = onSelect.mock.calls[0][0] as CodeSelectionContext;

    expect(selection.startLine).toBe(1);
    expect(selection.endLine).toBe(2);
    expect(selection.filePath).toBe("/repo/answer.ts");
    expect(selection.text).toContain("const answer = 42;");
  });

  it("opens on the body at the pointer, clear of any transformed ancestor", () => {
    const { container } = renderSurface([
      { id: "send", label: "Send to agent", onSelect: () => {} }
    ]);

    highlight(container, 0, 0);
    fireEvent.contextMenu(container.querySelector("pre")!, { clientX: 400, clientY: 300 });

    const menu = screen.getByRole("menu");

    // Inside a modal — a transformed ancestor — a fixed menu would be offset by
    // the modal's own position instead of landing on the click.
    expect(container.contains(menu)).toBe(false);
    expect(menu.parentElement).toBe(document.body);
    expect(menu.style.left).toBe("400px");
    expect(menu.style.top).toBe("300px");
  });

  it("stays out of the way when nothing is highlighted", () => {
    const { container } = renderSurface([
      { id: "send", label: "Send to agent", onSelect: () => {} }
    ]);

    fireEvent.contextMenu(container.querySelector("pre")!);

    expect(screen.queryByRole("menuitem")).toBeNull();
  });

  it("reads the selection out of an editable surface's textarea", () => {
    const onSelect = vi.fn();
    const { container } = render(
      createElement(CodeSelectionActionsProvider, {
        actions: [{ id: "send", label: "Send to agent", onSelect }],
        children: createElement(CodeSurface, {
          content: FILE,
          editable: true,
          fileName: "answer.ts",
          filePath: "/repo/answer.ts",
          onContentChange: () => {}
        })
      })
    );

    const textarea = container.querySelector("textarea")!;
    const start = FILE.indexOf("\n") + 1;

    textarea.setSelectionRange(start, start + "const other = answer;".length);
    fireEvent.contextMenu(textarea);
    fireEvent.click(screen.getByRole("menuitem", { name: "Send to agent" }));

    const selection = onSelect.mock.calls[0][0] as CodeSelectionContext;

    expect(selection.text).toBe("const other = answer;");
    expect(selection.startLine).toBe(2);
    expect(selection.endLine).toBe(2);
  });

  it("counts a multi-line textarea selection to the line it really ends on", () => {
    const onSelect = vi.fn();
    const { container } = render(
      createElement(CodeSelectionActionsProvider, {
        actions: [{ id: "send", label: "Send to agent", onSelect }],
        children: createElement(CodeSurface, {
          content: FILE,
          editable: true,
          fileName: "answer.ts",
          onContentChange: () => {}
        })
      })
    );

    const textarea = container.querySelector("textarea")!;

    textarea.setSelectionRange(0, FILE.lastIndexOf("\n") + 1);
    fireEvent.contextMenu(textarea);
    fireEvent.click(screen.getByRole("menuitem", { name: "Send to agent" }));

    expect((onSelect.mock.calls[0][0] as CodeSelectionContext).endLine).toBe(2);
  });

  it("shows no menu where no provider and no prop offer one", () => {
    const { container } = render(
      createElement(CodeSurface, { content: FILE, fileName: "answer.ts" })
    );

    highlight(container, 0, 0);
    fireEvent.contextMenu(container.querySelector("pre")!);

    expect(screen.queryByRole("menuitem")).toBeNull();
  });
});
