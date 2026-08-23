import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { CaretBox } from "../caret-box";
import type { Suggestion } from "../script-api";

interface ScriptSuggestionListProps {
  items: Suggestion[];
  caret: CaretBox | null;
  frame: { width: number; height: number };
  highlighted: number;
  onPick: (suggestion: Suggestion) => void;
  onHighlight: (index: number) => void;
}

const WIDTH = 320;
const MAX_HEIGHT = 168;

function placement(caret: CaretBox, frame: { width: number; height: number }) {
  const below = caret.top + caret.lineHeight;
  const fitsBelow = below + MAX_HEIGHT <= frame.height;

  return {
    left: Math.max(4, Math.min(caret.left, frame.width - WIDTH - 4)),
    top: fitsBelow ? below : Math.max(4, caret.top - MAX_HEIGHT)
  };
}

export function ScriptSuggestionList({
  items,
  caret,
  frame,
  highlighted,
  onPick,
  onHighlight
}: Readonly<ScriptSuggestionListProps>) {
  const { t } = useTranslation();

  if (items.length === 0 || !caret) return null;

  const { left, top } = placement(caret, frame);

  return (
    <div
      style={{ left, top, width: WIDTH, maxHeight: MAX_HEIGHT }}
      className={clsx(
        "absolute z-20 flex flex-col overflow-hidden rounded-lg border border-border",
        "bg-bg shadow-xl"
      )}
    >
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {items.map((item, index) => (
          <li key={item.label}>
            <button
              type="button"
              onMouseEnter={() => onHighlight(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                onPick(item);
              }}
              className={clsx(
                "flex w-full items-baseline gap-2 px-2.5 py-1.5 text-left transition-colors",
                index === highlighted ? "bg-accent/10" : "hover:bg-text/[0.04]"
              )}
            >
              <span className="shrink-0 font-mono text-[11px] text-text">
                {item.label}
                {item.signature ? <span className="text-muted">{item.signature}</span> : null}
              </span>
              <span className="min-w-0 flex-1 truncate text-right text-[10px] text-muted">
                {item.detail}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="shrink-0 border-t border-border px-2.5 py-1 text-[10px] text-muted">
        {t(translation.ApiStudio.SuggestionKeys)}
      </div>
    </div>
  );
}
