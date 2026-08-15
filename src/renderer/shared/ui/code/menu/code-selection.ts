import type { UiIconName } from "@renderer/shared/ui/icons/UiIcon";

const LINE_ATTRIBUTE = "[data-code-line]";

export interface CodeSelection {
  text: string;
  startLine: number;
  endLine: number;
}

export interface CodeSelectionContext extends CodeSelection {
  filePath: string | null;
  fileName: string | null;
}

export interface CodeSelectionAction {
  id: string;
  label: string;
  icon?: UiIconName;
  disabled?: boolean;
  onSelect: (selection: CodeSelectionContext) => void;
}

function lineNumberOf(scroller: HTMLElement, node: Node): number | null {
  const element = node instanceof Element ? node : node.parentElement;
  const line = element?.closest(LINE_ATTRIBUTE);

  if (!line?.parentElement || !scroller.contains(line)) return null;

  const index = Array.prototype.indexOf.call(line.parentElement.children, line);

  return index === -1 ? null : index + 1;
}

export function readTextareaSelection(
  textarea: HTMLTextAreaElement | null
): CodeSelection | null {
  if (!textarea) return null;

  const { selectionStart, selectionEnd, value } = textarea;
  if (selectionStart === selectionEnd) return null;

  const text = value.slice(selectionStart, selectionEnd);
  if (text.trim().length === 0) return null;

  const before = value.slice(0, selectionStart).split("\n").length;

  return {
    text,
    startLine: before,
    endLine: before + text.replace(/\n$/, "").split("\n").length - 1
  };
}

export function readCodeSelection(scroller: HTMLElement): CodeSelection | null {
  const selection = globalThis.getSelection();

  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);

  if (!scroller.contains(range.commonAncestorContainer)) return null;

  const text = selection.toString();
  if (text.trim().length === 0) return null;

  const start = lineNumberOf(scroller, range.startContainer);
  let end = lineNumberOf(scroller, range.endContainer);

  if (start === null || end === null) return null;

  if (end > start && range.endOffset === 0) end -= 1;

  return { text, startLine: start, endLine: Math.max(start, end) };
}
