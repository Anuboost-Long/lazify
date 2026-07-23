import clsx from "clsx";
import { useRef, type ReactNode } from "react";

import { useHighlightedLines } from "./CodeText";
import { PLAIN_LANGUAGE } from "./highlighter/languages";
import { useCodePalette } from "./highlighter/use-highlighter";
import { languageOf } from "./tokenize";

interface CodeSurfaceProps {
  content: string;
  /** Drives which syntax rules apply; the file's own name is enough. */
  fileName?: string | null;
  /** Omit to render read-only, which is also the only highlighted mode. */
  onContentChange?: (value: string) => void;
  placeholder?: string;
  /**
   * "panel" is the framed, roomy surface the editor panes use. "flush" fills a
   * container that already provides its own frame — a modal body — and packs
   * the lines tighter for reading.
   */
  variant?: "panel" | "flush";
  className?: string;
}

const STYLES = {
  panel: {
    frame: "rounded-[20px] border border-accent/15 bg-bg/60",
    gutter: "w-14 px-3 py-4 text-xs leading-[25px]",
    code: "px-5 py-4 text-sm leading-[25px]",
  },
  flush: {
    frame: "",
    // Gutter and code share one leading to the pixel: they are two separately
    // scrolled columns, so any difference walks the line numbers off the code.
    gutter: "w-12 px-2 py-2 text-[11px] leading-[25px]",
    code: "px-3 py-2 text-[12px] leading-[25px]",
  },
} as const;

const GUTTER_BASE =
  "shrink-0 overflow-hidden border-r border-border bg-bg/60 text-right font-mono text-muted/80";
const CODE_BASE = "h-full w-full font-mono";

/**
 * The gutter-plus-code area both editor panes were carrying their own copy of.
 * Read-only content is syntax highlighted; an editable surface stays a plain
 * textarea, because keeping highlight spans aligned under a caret is a
 * different problem from painting static text.
 */
export function CodeSurface({
  content,
  fileName,
  onContentChange,
  placeholder,
  variant = "panel",
  className,
}: Readonly<CodeSurfaceProps>) {
  const style = STYLES[variant];
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const language = languageOf(fileName);
  const lines = useHighlightedLines(
    content,
    onContentChange ? PLAIN_LANGUAGE : language,
  );
  const palette = useCodePalette();

  // A dark code theme inside a light pane (or the reverse) has to bring its own
  // background, the way the VS Code editor does. Editable surfaces keep the
  // app's colours, since they are not themed.
  const themed =
    palette && !onContentChange
      ? { background: palette.bg, color: palette.fg }
      : undefined;

  const syncGutter = (scrollTop: number) => {
    if (gutterRef.current) gutterRef.current.scrollTop = scrollTop;
  };

  return (
    <div
      className={clsx(
        "flex h-full overflow-hidden text-text",
        style.frame,
        className,
      )}
    >
      <div
        ref={gutterRef}
        className={clsx(GUTTER_BASE, style.gutter)}
        style={themed ? { background: themed.background } : undefined}
      >
        {lines.map((_, index) => (
          <div key={index}>{index + 1}</div>
        ))}
      </div>

      {onContentChange ? (
        <textarea
          value={content}
          onChange={(event) => onContentChange(event.target.value)}
          onScroll={(event) => syncGutter(event.currentTarget.scrollTop)}
          spellCheck={false}
          className={clsx(
            CODE_BASE,
            style.code,
            "resize-none overflow-y-auto bg-transparent text-text outline-none",
          )}
          placeholder={placeholder}
        />
      ) : (
        <pre
          onScroll={(event) => syncGutter(event.currentTarget.scrollTop)}
          className={clsx(
            CODE_BASE,
            style.code,
            "overflow-auto whitespace-pre bg-transparent",
          )}
          style={themed}
        >
          {lines.map((line, index) => (
            <div key={index}>{line as ReactNode}</div>
          ))}
        </pre>
      )}
    </div>
  );
}
