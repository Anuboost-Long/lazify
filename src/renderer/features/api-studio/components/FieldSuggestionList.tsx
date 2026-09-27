import clsx from "clsx";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { Suggestion } from "../script-api";

interface FieldSuggestionListProps {
  items: Suggestion[];
  anchor: DOMRect | null;
  highlighted: number;
  onPick: (suggestion: Suggestion) => void;
  onHighlight: (index: number) => void;
}

const WIDTH = 260;
const MAX_HEIGHT = 168;
const GAP = 4;
const EDGE = 8;

/**
 * A field row lives inside a scrolling table, so an absolutely-positioned
 * dropdown would get clipped by the table's own overflow — this one anchors
 * to the input's screen position and portals out to the body instead, the
 * same escape `ContextMenu` uses for a row's own floating menu.
 */
export function FieldSuggestionList({
  items,
  anchor,
  highlighted,
  onPick,
  onHighlight,
}: Readonly<FieldSuggestionListProps>) {
  const { t } = useTranslation();

  if (items.length === 0 || !anchor) return null;

  const below = anchor.bottom + GAP;
  const fitsBelow = below + MAX_HEIGHT <= globalThis.innerHeight;
  const top = fitsBelow ? below : Math.max(EDGE, anchor.top - GAP - MAX_HEIGHT);
  const left = Math.min(anchor.left, globalThis.innerWidth - WIDTH - EDGE);

  return createPortal(
    <div
      style={{ left, top, width: WIDTH, maxHeight: MAX_HEIGHT }}
      className={clsx(
        "fixed z-[101] flex flex-col overflow-hidden rounded-lg border border-border",
        "bg-bg shadow-xl",
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
                "flex w-full items-center px-2.5 py-1.5 text-left transition-colors",
                index === highlighted ? "bg-accent/10" : "hover:bg-text/[0.04]",
              )}
            >
              <span className="truncate font-mono text-[11px] text-text">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="shrink-0 border-t border-border px-2.5 py-1 text-[10px] text-muted">
        {t(translation.ApiStudio.SuggestionKeys)}
      </div>
    </div>,
    document.body,
  );
}
