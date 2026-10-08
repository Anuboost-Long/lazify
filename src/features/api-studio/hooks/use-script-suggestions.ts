import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { caretBoxOf, type CaretBox } from "../caret-box";
import {
  suggestionsFor,
  type ScriptPhase,
  type Suggestion,
  type SuggestionSource
} from "../script-api";

const OWNED_KEYS = new Set(["ArrowUp", "ArrowDown", "Enter", "Tab", "Escape"]);

export function useScriptSuggestions(
  globalName: string,
  phase: ScriptPhase,
  known: SuggestionSource,
  onChange: (text: string) => void
) {
  const input = useRef<HTMLTextAreaElement | null>(null);
  const [context, setContext] = useState<{ partial: string; items: Suggestion[] }>({
    partial: "",
    items: []
  });
  const [caret, setCaret] = useState<CaretBox | null>(null);
  const [highlighted, setHighlighted] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const items = dismissed ? [] : context.items;
  const open = useRef(false);
  const inputs = useRef({ globalName, phase, known });

  open.current = items.length > 0;
  inputs.current = { globalName, phase, known };

  const recompute = () => {
    const field = input.current;
    if (!field) return;

    const asked = inputs.current;
    const next = suggestionsFor(
      field.value,
      field.selectionStart,
      asked.globalName,
      asked.phase,
      asked.known
    );

    setContext(next);
    setCaret(next.items.length > 0 ? caretBoxOf(field) : null);
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

    const caretAt = field.selectionStart;
    const start = caretAt - context.partial.length;
    const text = field.value;
    const at = start + suggestion.insert.length - suggestion.caretBack;

    onChange(`${text.slice(0, start)}${suggestion.insert}${text.slice(caretAt)}`);
    setContext({ partial: "", items: [] });
    setCaret(null);
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(at, at);
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
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
        setCaret(null);
        return;
      default:
        setDismissed(false);
    }
  };

  return {
    input,
    items,
    caret,
    highlighted,
    onKeyDown,
    apply,
    highlight: setHighlighted,
    follow: recompute
  };
}
