import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import type { Suggestion } from "../script-api";

const OWNED_KEYS = new Set(["ArrowUp", "ArrowDown", "Enter", "Tab", "Escape"]);

/** An unclosed `{{name` right before the caret — what a variable link looks like mid-type. */
const OPEN_TOKEN = /\{\{\s*([\w.-]*)$/;

function itemsFor(partial: string, names: string[]): Suggestion[] {
  const lower = partial.toLowerCase();

  return Array.from(new Set(names.filter(Boolean)))
    .filter((name) => name.toLowerCase().startsWith(lower))
    .sort((left, right) => left.localeCompare(right))
    .map((name) => ({ label: name, signature: null, detail: "", insert: `${name}}}`, caretBack: 0 }));
}

/**
 * Suggests every environment variable while a `{{name` link is being typed
 * into a plain field (a header, param, or auth value) — the same completion
 * idea as the script editor's, minus the script-language awareness it needs.
 */
export function useVariableSuggestions(names: string[], onChange: (text: string) => void) {
  const input = useRef<HTMLInputElement | null>(null);
  const [context, setContext] = useState<{ partial: string; items: Suggestion[] }>({
    partial: "",
    items: [],
  });
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [highlighted, setHighlighted] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const items = dismissed ? [] : context.items;
  const open = useRef(false);
  const namesRef = useRef(names);

  open.current = items.length > 0;
  namesRef.current = names;

  const recompute = () => {
    const field = input.current;
    if (!field) return;

    const caretAt = field.selectionStart ?? field.value.length;
    const match = OPEN_TOKEN.exec(field.value.slice(0, caretAt));

    if (!match) {
      setContext({ partial: "", items: [] });
      setAnchor(null);
      return;
    }

    const partial = match[1];
    const next = itemsFor(partial, namesRef.current);

    setContext({ partial, items: next });
    setAnchor(next.length > 0 ? field.getBoundingClientRect() : null);
    setHighlighted(0);
  };

  useEffect(() => {
    const field = input.current;
    if (!field) return;

    const follow = (event: Event) => {
      if (event instanceof globalThis.KeyboardEvent && OWNED_KEYS.has(event.key) && open.current) {
        return;
      }

      recompute();
    };

    field.addEventListener("keyup", follow);
    field.addEventListener("click", follow);

    return () => {
      field.removeEventListener("keyup", follow);
      field.removeEventListener("click", follow);
    };
  }, []);

  const apply = (suggestion: Suggestion) => {
    const field = input.current;
    if (!field) return;

    const caretAt = field.selectionStart ?? field.value.length;
    const start = caretAt - context.partial.length;
    const text = field.value;
    const at = start + suggestion.insert.length - suggestion.caretBack;

    onChange(`${text.slice(0, start)}${suggestion.insert}${text.slice(caretAt)}`);
    setContext({ partial: "", items: [] });
    setAnchor(null);
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(at, at);
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (items.length === 0) {
      if (event.key !== "Escape") setDismissed(false);
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setHighlighted((current) => (current + 1) % items.length);
        return;
      case "ArrowUp":
        event.preventDefault();
        setHighlighted((current) => (current - 1 + items.length) % items.length);
        return;
      case "Tab":
      case "Enter":
        event.preventDefault();
        apply(items[highlighted]);
        return;
      case "Escape":
        event.preventDefault();
        setDismissed(true);
        return;
      default:
        setDismissed(false);
    }
  };

  return {
    input,
    items,
    anchor,
    highlighted,
    onKeyDown,
    apply,
    highlight: setHighlighted,
    follow: recompute,
  };
}
