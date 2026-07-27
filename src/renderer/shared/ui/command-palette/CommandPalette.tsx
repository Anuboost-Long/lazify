import clsx from "clsx";
import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import UiIcon from "@renderer/shared/ui/icons/UiIcon";

/**
 * The generic command-palette shell: a centered modal with a search field and a
 * ranked, keyboard-driven list. It owns presentation and navigation only — what
 * the rows are, and how they are ranked, is the caller's business. Files drive
 * it today (see FileQuickOpen); a command source can drive it unchanged later.
 */

interface CommandPaletteProps<T> {
  open: boolean;
  query: string;
  placeholder: string;
  emptyLabel: string;
  items: readonly T[];
  /** Stable key per item, for React and for tracking the active row. */
  getKey: (item: T) => string;
  renderItem: (item: T, active: boolean) => ReactNode;
  onQueryChange: (query: string) => void;
  onSelect: (item: T) => void;
  onClose: () => void;
}

export function CommandPalette<T>({
  open,
  query,
  placeholder,
  emptyLabel,
  items,
  getKey,
  renderItem,
  onQueryChange,
  onSelect,
  onClose,
}: CommandPaletteProps<T>) {
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // A new query re-ranks everything, so the highlight returns to the top.
  useEffect(() => setActiveIndex(0), [query, open]);

  // Focus the field the moment it opens.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Keep the active row in view as the selection moves.
  useLayoutEffect(() => {
    const list = listRef.current;
    const active = list?.children[activeIndex] as HTMLElement | undefined;
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, items]);

  if (!open) return null;

  const clampedActive = Math.min(activeIndex, Math.max(items.length - 1, 0));

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (items.length ? (current + 1) % items.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        items.length ? (current - 1 + items.length) % items.length : 0,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = items[clampedActive];
      if (item) onSelect(item);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
      onMouseDown={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
        className={clsx(
          "relative flex w-full max-w-xl flex-col overflow-hidden",
          "rounded-2xl border border-border bg-bg shadow-panel",
        )}
      >
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <UiIcon name="search" className="h-4 w-4 shrink-0 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            spellCheck={false}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-muted/70"
          />
        </div>

        {items.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted">{emptyLabel}</div>
        ) : (
          <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-1">
            {items.map((item, index) => {
              const active = index === clampedActive;
              return (
                <Fragment key={getKey(item)}>
                  <button
                    type="button"
                    onMouseMove={() => setActiveIndex(index)}
                    onClick={() => onSelect(item)}
                    className={clsx(
                      "relative flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors",
                      // Hover sets the active row, so this one style covers both
                      // the mouse and the keyboard selection — kept prominent so
                      // it is unmistakable which row Enter will open.
                      active ? "bg-accent/25" : "hover:bg-accent/10",
                    )}
                  >
                    {active ? (
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 w-0.5 bg-accent"
                      />
                    ) : null}
                    {renderItem(item, active)}
                  </button>
                </Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Renders `text` with the characters at `positions` emphasised — the standard
 * quick-open affordance that shows why a result matched.
 */
export function HighlightedText({
  text,
  positions,
  className,
  matchClassName = "text-accent",
}: Readonly<{
  text: string;
  positions: readonly number[];
  className?: string;
  matchClassName?: string;
}>) {
  const hits = new Set(positions);

  return (
    <span className={className}>
      {Array.from(text).map((char, index) =>
        hits.has(index) ? (
          <span key={index} className={clsx("font-semibold", matchClassName)}>
            {char}
          </span>
        ) : (
          <Fragment key={index}>{char}</Fragment>
        ),
      )}
    </span>
  );
}
