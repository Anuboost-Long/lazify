// @vitest-environment jsdom

import { cleanup, fireEvent, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { CodeSurface } from "../../src/renderer/shared/ui/code/CodeSurface";
import {
  matchAtOrAfter,
  rangeAtOrAfter,
  seedFromElement,
  seedFromTextarea
} from "../../src/renderer/shared/ui/code/find/selection";

const FILE = "const answer = 42;\nconst other = answer;";
/** The two occurrences of "answer", by offset into FILE. */
const FIRST = 6;
const SECOND = 33;

beforeAll(() => {
  // jsdom lays nothing out, so every element reports no boxes — and the find
  // registry only hands the shortcut to a surface that is actually on screen.
  Element.prototype.getClientRects = () => [{}] as unknown as DOMRectList;
});

afterEach(() => cleanup());

/** jsdom's UA is not a Mac, so the registry wants Ctrl rather than Cmd. */
function pressFind() {
  fireEvent.keyDown(window, { key: "f", ctrlKey: true });
}

function renderEditable() {
  const { container } = render(
    createElement(CodeSurface, {
      content: FILE,
      editable: true,
      fileName: "answer.ts",
      onContentChange: () => {}
    })
  );

  return {
    container,
    textarea: container.querySelector("textarea"),
    input: () => container.querySelector("input")
  };
}

describe("find seeded from the selection", () => {
  it("searches for the word highlighted in an editable surface", () => {
    const { textarea, input } = renderEditable();

    textarea?.setSelectionRange(FIRST, FIRST + 6);
    pressFind();

    expect(input()?.value).toBe("answer");
  });

  it("opens on the occurrence that was highlighted, not the first in the file", () => {
    const { container, textarea } = renderEditable();

    textarea?.setSelectionRange(SECOND, SECOND + 6);
    pressFind();

    expect(container.textContent).toContain("2/2");
  });

  it("counts from the top when the first occurrence is the one highlighted", () => {
    const { container, textarea } = renderEditable();

    textarea?.setSelectionRange(FIRST, FIRST + 6);
    pressFind();

    expect(container.textContent).toContain("1/2");
  });

  it("leaves the query alone when the shortcut is pressed again", () => {
    const { textarea, input } = renderEditable();

    textarea?.setSelectionRange(FIRST, FIRST + 6);
    pressFind();

    fireEvent.change(input() as HTMLInputElement, { target: { value: "42" } });

    // Re-pressing is how the reader gets back to the bar; the stale selection
    // must not overwrite what they typed.
    textarea?.setSelectionRange(0, 5);
    pressFind();

    expect(input()?.value).toBe("42");
  });

  it("opens empty when nothing is highlighted", () => {
    const { input } = renderEditable();

    pressFind();

    expect(input()?.value).toBe("");
  });
});

describe("what counts as a seed", () => {
  it("takes a single-line selection from a textarea, with where it sat", () => {
    const textarea = document.createElement("textarea");
    textarea.value = FILE;
    textarea.setSelectionRange(SECOND, SECOND + 6);

    expect(seedFromTextarea(textarea)).toEqual({ text: "answer", at: SECOND });
  });

  it("ignores a caret, a selection across lines, and an oversized one", () => {
    const textarea = document.createElement("textarea");
    textarea.value = FILE;

    textarea.setSelectionRange(FIRST, FIRST);
    expect(seedFromTextarea(textarea)).toBeNull();

    textarea.setSelectionRange(0, FILE.length);
    expect(seedFromTextarea(textarea)).toBeNull();

    textarea.value = "x".repeat(400);
    textarea.setSelectionRange(0, 400);
    expect(seedFromTextarea(textarea)).toBeNull();
  });

  it("takes a document selection only while it lies inside the surface", () => {
    const root = document.createElement("div");
    const outside = document.createElement("div");
    root.textContent = "const answer = 42;";
    outside.textContent = "elsewhere";
    document.body.append(root, outside);

    const select = (node: Node) => {
      const range = document.createRange();
      range.selectNodeContents(node);

      const selection = globalThis.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    };

    select(root.firstChild as Node);
    expect(seedFromElement(root)?.text).toBe("const answer = 42;");

    select(outside.firstChild as Node);
    expect(seedFromElement(root)).toBeNull();

    root.remove();
    outside.remove();
  });
});

describe("which match the search opens on", () => {
  it("picks the first offset at or after the selection, else wraps", () => {
    expect(matchAtOrAfter([6, 33], 33)).toBe(1);
    expect(matchAtOrAfter([6, 33], 7)).toBe(1);
    expect(matchAtOrAfter([6, 33], 0)).toBe(0);
    // Nothing below it, so the search comes back round to the top.
    expect(matchAtOrAfter([6, 33], 40)).toBe(0);
    expect(matchAtOrAfter([], 40)).toBe(0);
  });

  it("does the same over painted code", () => {
    const host = document.createElement("div");
    host.textContent = FILE;
    document.body.append(host);

    const text = host.firstChild as Text;
    const at = (start: number, length: number) => {
      const range = document.createRange();
      range.setStart(text, start);
      range.setEnd(text, start + length);

      return range;
    };

    const matches = [at(FIRST, 6), at(SECOND, 6)];

    expect(rangeAtOrAfter(matches, at(SECOND, 6))).toBe(1);
    expect(rangeAtOrAfter(matches, at(FIRST, 6))).toBe(0);
    expect(rangeAtOrAfter(matches, at(FILE.length - 1, 1))).toBe(0);

    host.remove();
  });
});
