import clsx from "clsx";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { MonoText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { CodeFind } from "./use-code-find";

/**
 * The find bar an editor floats over its own text: it never takes width from the
 * code, and Escape gives the panel straight back.
 */
export function CodeFindBar({ find }: Readonly<{ find: CodeFind }>) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Pressing the shortcut again while the bar is open selects what is in it, so
  // the next thing typed replaces the last search.
  useEffect(() => {
    if (!find.open) return;

    inputRef.current?.focus();
    inputRef.current?.select();
  }, [find.open, find.openedAt]);

  if (!find.open) return null;

  const empty = find.query.length > 0 && find.count === 0;

  return (
    <div
      className={clsx(
        "absolute right-3 top-2 z-20 flex items-center gap-1 rounded-lg",
        "border border-border bg-soft/95 px-1.5 py-1 shadow-lg backdrop-blur"
      )}
    >
      <UiIcon name="search" className="h-3.5 w-3.5 shrink-0 text-muted" />

      <input
        ref={inputRef}
        value={find.query}
        onChange={(event) => find.setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            find.close();
            return;
          }

          if (event.key !== "Enter") return;

          event.preventDefault();
          if (event.shiftKey) find.previous();
          else find.next();
        }}
        spellCheck={false}
        placeholder={t(translation.CodeFind.Placeholder)}
        aria-label={t(translation.CodeFind.Placeholder)}
        className={clsx(
          "w-40 bg-transparent font-mono text-[12px] outline-none placeholder:text-muted/70",
          empty ? "text-error" : "text-text"
        )}
      />

      <MonoText as="span" className="shrink-0 px-1 !text-muted text-[11px]">
        {find.count === 0
          ? t(translation.CodeFind.NoResults)
          : `${find.index + 1}/${find.count}`}
      </MonoText>

      <button
        type="button"
        aria-label={t(translation.CodeFind.PreviousMatch)}
        onClick={find.previous}
        className="rounded p-0.5 transition-colors hover:bg-text/10"
      >
        <UiIcon name="arrow-left" className="h-3 w-3 rotate-90 text-muted" />
      </button>
      <button
        type="button"
        aria-label={t(translation.CodeFind.NextMatch)}
        onClick={find.next}
        className="rounded p-0.5 transition-colors hover:bg-text/10"
      >
        <UiIcon name="arrow-right" className="h-3 w-3 rotate-90 text-muted" />
      </button>
      <button
        type="button"
        aria-label={t(translation.CodeFind.Close)}
        onClick={find.close}
        className="rounded p-0.5 transition-colors hover:bg-text/10"
      >
        <UiIcon name="xmark" className="h-3 w-3 text-muted" />
      </button>
    </div>
  );
}
