import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { MonoText, SmallText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { CodeLineText } from "@renderer/shared/ui/code/CodeText";
import { CodeFindBar } from "@renderer/shared/ui/code/find/CodeFindBar";
import { useCodeFind } from "@renderer/shared/ui/code/find/use-code-find";
import { useCodePalette } from "@renderer/shared/ui/code/highlighter/use-highlighter";
import { languageOf } from "@renderer/shared/ui/code/tokenize";
import {
  type DiffRegion,
  type DiffRow,
  foldUnchanged,
  parseDiffRows,
  toSplitRows
} from "./parse-diff";

export type DiffViewMode = "unified" | "split";

interface DiffViewProps {
  diff: string;
  mode: DiffViewMode;
  fileName?: string | null;
  showHunkHeaders?: boolean;
  collapseUnchanged?: boolean;
}

const MAX_RENDERED_ROWS = 3000;

const MIN_SPLIT_RATIO = 0.15;
const SEAM_KEYBOARD_STEP = 0.05;

const LINE_CLASS = "whitespace-pre-wrap break-words text-[12px] leading-[25px]";
const NUMBER_CLASS =
  "w-12 shrink-0 select-none border-r border-border bg-bg/60 px-2 text-right text-[11px] leading-[25px] text-muted/80";

function rowTone(type: DiffRow["type"]) {
  if (type === "add") return { background: "bg-emerald-500/[0.20] dark:bg-emerald-400/[0.16]", text: "text-emerald-900 dark:text-emerald-100" };
  if (type === "remove") return { background: "bg-rose-500/[0.20] dark:bg-rose-400/[0.16]", text: "text-rose-900 dark:text-rose-100" };
  return { background: "", text: "text-text/70" };
}

function isChange(row: DiffRow | null | undefined) {
  return row?.type === "add" || row?.type === "remove";
}

function HunkRow({ text }: Readonly<{ text: string }>) {
  return (
    <MonoText
      as="span"
      className={clsx("block bg-sky-500/[0.10] dark:bg-sky-400/[0.06] px-2 !text-sky-700 dark:!text-sky-300/80", LINE_CLASS)}
    >
      {text}
    </MonoText>
  );
}

function CodeLine({
  row,
  number,
  language,
  themed
}: Readonly<{
  row: DiffRow | null;
  number: number | null;
  language: string;
  themed: boolean;
}>) {
  const tone = rowTone(row?.type ?? "context");

  return (
    <div
      data-code-line=""
      className={clsx("flex min-w-0 flex-1", row ? tone.background : "bg-text/[0.02]")}
    >
      <MonoText as="span" data-code-ignore="" className={NUMBER_CLASS}>
        {number ?? " "}
      </MonoText>
      <MonoText
        as="span"
        className={clsx("min-w-0 flex-1 px-3", LINE_CLASS, !themed && tone.text)}
      >
        {row ? <CodeLineText text={row.text} language={language} /> : " "}
      </MonoText>
    </div>
  );
}

function FoldBand({ count, onExpand }: Readonly<{ count: number; onExpand: () => void }>) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onExpand}
      className={clsx(
        "flex w-full items-center justify-center gap-1.5 border-y border-border",
        "bg-text/[0.02] py-0.5 transition-colors hover:bg-text/[0.06]"
      )}
    >
      <UiIcon name="collapse" className="h-3 w-3 text-muted" />
      <SmallText as="span" className="!text-muted">
        {t(translation.Agents.DiffUnchangedLines, { lines: count })}
      </SmallText>
    </button>
  );
}

export function DiffView({
  diff,
  mode,
  fileName,
  showHunkHeaders = true,
  collapseUnchanged = false
}: Readonly<DiffViewProps>) {
  const { t } = useTranslation();
  const language = languageOf(fileName);
  const palette = useCodePalette();
  const themed = Boolean(palette);
  const rows = useMemo(() => parseDiffRows(diff), [diff]);
  const [expanded, setExpanded] = useState<number[]>([]);
  const [current, setCurrent] = useState(0);
  const changeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [draggingSeam, setDraggingSeam] = useState(false);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const painted = useMemo(() => ({}), [diff, mode, expanded, showHunkHeaders]);
  const find = useCodeFind({ root: frameRef, scroller: scrollerRef, revision: painted });

  const blockIndexByRow = useMemo(() => {
    const map = new Map<DiffRow, number>();
    let previousChanged = false;
    let index = 0;

    for (const row of rows) {
      const changed = isChange(row);
      if (changed && !previousChanged) map.set(row, index++);
      previousChanged = changed;
    }

    return map;
  }, [rows]);

  const totalChanges = blockIndexByRow.size;

  const regions = useMemo<DiffRegion[]>(() => {
    const folded = collapseUnchanged ? foldUnchanged(rows) : [{ kind: "rows" as const, rows }];

    return folded.map((region) =>
      region.kind === "fold" && expanded.includes(region.id)
        ? { kind: "rows" as const, rows: region.rows }
        : region
    );
  }, [collapseUnchanged, expanded, rows]);

  const { visible, truncated } = useMemo(() => {
    const kept: DiffRegion[] = [];
    let budget = MAX_RENDERED_ROWS;

    for (const region of regions) {
      const cost = region.kind === "fold" ? 1 : region.rows.length;

      if (cost <= budget) {
        kept.push(region);
        budget -= cost;
        continue;
      }

      if (region.kind === "rows" && budget > 0) {
        kept.push({ kind: "rows", rows: region.rows.slice(0, budget) });
      }

      return { visible: kept, truncated: true };
    }

    return { visible: kept, truncated: false };
  }, [regions]);

  useEffect(() => {
    setExpanded([]);
    setCurrent(0);
    changeRefs.current = [];
  }, [diff]);

  useEffect(() => {
    changeRefs.current[0]?.scrollIntoView({ block: "center" });
  }, [diff, mode]);

  const commitRatio = (clientX: number) => {
    const bounds = frameRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width === 0) return;

    const next = (clientX - bounds.left) / bounds.width;

    setSplitRatio(Math.min(Math.max(next, MIN_SPLIT_RATIO), 1 - MIN_SPLIT_RATIO));
  };

  const scrollToChange = (index: number) => {
    if (totalChanges === 0) return;

    const next = (index + totalChanges) % totalChanges;

    setCurrent(next);
    changeRefs.current[next]?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const changeRef = (row: DiffRow | null | undefined) => {
    const index = row ? blockIndexByRow.get(row) : undefined;

    if (index === undefined) return undefined;

    return (element: HTMLDivElement | null) => {
      changeRefs.current[index] = element;
    };
  };

  const renderRows = (regionRows: DiffRow[], key: string) => {
    if (mode === "split") {
      return toSplitRows(regionRows).map((row, index) =>
        row.kind === "hunk" ? (
          showHunkHeaders ? (
            <HunkRow key={`${key}-h${index}`} text={row.text} />
          ) : null
        ) : (
          <div
            key={`${key}-p${index}`}
            ref={changeRef(isChange(row.left) ? row.left : row.right)}
            className="flex items-stretch gap-px"
          >
            <div className="flex min-w-0 overflow-hidden" style={{ width: `${splitRatio * 100}%` }}>
              <CodeLine
                row={row.left}
                number={row.left?.oldNumber ?? null}
                language={language}
                themed={themed}
              />
            </div>
            <div className="flex min-w-0 flex-1 overflow-hidden border-l border-border">
              <CodeLine
                row={row.right}
                number={row.right?.newNumber ?? null}
                language={language}
                themed={themed}
              />
            </div>
          </div>
        )
      );
    }

    return regionRows.map((row, index) => {
      if (row.type === "hunk") {
        return showHunkHeaders ? <HunkRow key={`${key}-h${index}`} text={row.text} /> : null;
      }

      const tone = rowTone(row.type);

      return (
        <div
          key={`${key}-r${index}`}
          ref={changeRef(row)}
          data-code-line=""
          className={clsx("flex", tone.background)}
        >
          <MonoText as="span" data-code-ignore="" className={NUMBER_CLASS}>
            {row.oldNumber ?? " "}
          </MonoText>
          <MonoText as="span" data-code-ignore="" className={NUMBER_CLASS}>
            {row.newNumber ?? " "}
          </MonoText>
          <MonoText
            as="span"
            className={clsx(
              "w-3 shrink-0 text-center font-bold",
              LINE_CLASS,
              row.type === "add" ? "text-emerald-500" : row.type === "remove" ? "text-rose-500" : ""
            )}
          >
            {row.type === "add" ? "+" : row.type === "remove" ? "-" : " "}
          </MonoText>
          <MonoText
            as="span"
            className={clsx("min-w-0 flex-1 px-3", LINE_CLASS, !themed && tone.text)}
          >
            <CodeLineText text={row.text} language={language} />
          </MonoText>
        </div>
      );
    });
  };

  return (
    <div ref={frameRef} className="relative h-full min-h-0 flex-1 overflow-hidden">
      <div
        ref={scrollerRef}
        className="h-full overflow-auto py-2"
        style={palette ? { background: palette.bg, color: palette.fg } : undefined}
      >
        {visible.map((region, index) =>
          region.kind === "fold" ? (
            <FoldBand
              key={`fold-${region.id}`}
              count={region.rows.length}
              onExpand={() => setExpanded((open) => [...open, region.id])}
            />
          ) : (
            renderRows(region.rows, `s${index}`)
          )
        )}

        {truncated ? (
          <SmallText className="!text-amber-700 dark:!text-amber-300/70 px-2 py-2">
            {t(translation.Agents.DiffTruncated, { lines: MAX_RENDERED_ROWS })}
          </SmallText>
        ) : null}
      </div>

      <CodeFindBar find={find} />

      {mode === "split" ? (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={t(translation.Agents.DiffResizeColumns)}
          aria-valuenow={Math.round(splitRatio * 100)}
          tabIndex={0}
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            setDraggingSeam(true);
          }}
          onPointerMove={(event) => {
            if (draggingSeam) commitRatio(event.clientX);
          }}
          onPointerUp={(event) => {
            if (!draggingSeam) return;
            event.currentTarget.releasePointerCapture(event.pointerId);
            setDraggingSeam(false);
          }}
          onPointerCancel={() => setDraggingSeam(false)}
          onDoubleClick={() => setSplitRatio(0.5)}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            const step = event.key === "ArrowLeft" ? -SEAM_KEYBOARD_STEP : SEAM_KEYBOARD_STEP;
            setSplitRatio((current) =>
              Math.min(Math.max(current + step, MIN_SPLIT_RATIO), 1 - MIN_SPLIT_RATIO)
            );
          }}
          style={{ left: `${splitRatio * 100}%` }}
          className={clsx(
            "absolute inset-y-0 z-10 w-px -translate-x-1/2 cursor-col-resize touch-none",
            "select-none transition-colors focus:outline-none",
            draggingSeam ? "bg-accent" : "bg-transparent hover:bg-accent/50 focus-visible:bg-accent"
          )}
        >
          <span aria-hidden className="absolute inset-y-0 -left-1.5 -right-1.5" />
        </div>
      ) : null}

      {totalChanges > 1 ? (
        <div
          className={clsx(
            "absolute bottom-3 right-4 flex items-center gap-1 rounded-full",
            "border border-border bg-soft/90 px-1.5 py-1 shadow-lg"
          )}
        >
          <button
            type="button"
            aria-label={t(translation.Agents.DiffPreviousChange)}
            onClick={() => scrollToChange(current - 1)}
            className="rounded p-0.5 transition-colors hover:bg-text/10"
          >
            <UiIcon name="arrow-left" className="h-3 w-3 rotate-90 text-muted" />
          </button>
          <MonoText as="span" className="!text-muted px-1 text-[11px]">
            {`${current + 1}/${totalChanges}`}
          </MonoText>
          <button
            type="button"
            aria-label={t(translation.Agents.DiffNextChange)}
            onClick={() => scrollToChange(current + 1)}
            className="rounded p-0.5 transition-colors hover:bg-text/10"
          >
            <UiIcon name="arrow-right" className="h-3 w-3 rotate-90 text-muted" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
