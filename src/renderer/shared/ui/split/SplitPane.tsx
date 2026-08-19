import clsx from "clsx";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A two-pane split with a draggable divider, the way an editor sidebar works
 * across and a console does down the page.
 *
 * The first pane carries an explicit size and the second flexes. Size is
 * persisted per `storageKey` and clamped on every resize, so the second pane
 * can never be squeezed out of existence by a stale stored value.
 */

interface SplitPaneProps {
  first: ReactNode;
  second: ReactNode;
  /** Side by side, or stacked with the divider dragged up and down. */
  direction?: "horizontal" | "vertical";
  /** Persists the divider position across sessions when set. */
  storageKey?: string;
  /** Width of the sized pane in pixels, before any stored value. */
  defaultSize?: number;
  /** Smallest the sized pane may get. */
  minSize?: number;
  /** Smallest the flexible pane may get, so it stays usable. */
  minOtherSize?: number;
  className?: string;
  /** Accessible name for the divider handle. */
  label?: string;
}

/**
 * The divider occupies exactly one pixel so the panes sit flush against it.
 * Grabbing comfort comes from an invisible strip that overhangs both sides
 * rather than from real width, which would read as a gap.
 */
const HANDLE_WIDTH = 1;
const GRAB_OVERHANG = 5;
const KEYBOARD_STEP = 24;

function readStoredSize(storageKey: string | undefined, fallback: number): number {
  if (!storageKey || typeof window === "undefined") return fallback;

  const stored = Number(globalThis.localStorage.getItem(storageKey));

  return Number.isFinite(stored) && stored > 0 ? stored : fallback;
}

export function SplitPane({
  first,
  second,
  direction = "horizontal",
  storageKey,
  defaultSize = 300,
  minSize = 180,
  minOtherSize = 320,
  className,
  label = "Resize panels"
}: Readonly<SplitPaneProps>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState(() => readStoredSize(storageKey, defaultSize));
  const [dragging, setDragging] = useState(false);
  const vertical = direction === "vertical";

  const clamp = useCallback(
    (value: number) => {
      const element = containerRef.current;
      const extent = (vertical ? element?.clientHeight : element?.clientWidth) ?? 0;
      // Before layout settles there is nothing to clamp against.
      if (extent === 0) return Math.max(minSize, value);

      const upper = Math.max(minSize, extent - minOtherSize - HANDLE_WIDTH);

      return Math.min(Math.max(value, minSize), upper);
    },
    [minSize, minOtherSize, vertical]
  );

  const commit = useCallback(
    (value: number) => {
      const next = clamp(value);
      setSize(next);
      if (storageKey) globalThis.localStorage.setItem(storageKey, String(next));
    },
    [clamp, storageKey]
  );

  // The window getting narrower can invalidate a size that was legal before.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(() => setSize((current) => clamp(current)));
    observer.observe(element);

    return () => observer.disconnect();
  }, [clamp]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;

    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return;

    commit(vertical ? event.clientY - bounds.top : event.clientX - bounds.left);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;

    event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const back = vertical ? "ArrowUp" : "ArrowLeft";
    const forward = vertical ? "ArrowDown" : "ArrowRight";

    if (event.key === back) {
      event.preventDefault();
      commit(size - KEYBOARD_STEP);
    }
    if (event.key === forward) {
      event.preventDefault();
      commit(size + KEYBOARD_STEP);
    }
    if (event.key === "Home") {
      event.preventDefault();
      commit(minSize);
    }
    if (event.key === "End") {
      event.preventDefault();
      commit(Number.MAX_SAFE_INTEGER);
    }
  }

  const handle = (
    <div
      role="separator"
      aria-orientation={vertical ? "horizontal" : "vertical"}
      aria-label={label}
      aria-valuenow={Math.round(size)}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={() => commit(defaultSize)}
      onKeyDown={handleKeyDown}
      style={vertical ? { height: HANDLE_WIDTH } : { width: HANDLE_WIDTH }}
      className={clsx(
        "relative shrink-0 touch-none select-none transition-colors focus:outline-none",
        vertical ? "cursor-row-resize" : "cursor-col-resize",
        dragging ? "bg-accent" : "bg-border hover:bg-accent/50 focus-visible:bg-accent"
      )}
    >
      {/* Grab area, overhanging both panes. Transparent, so the seam still
          reads as a single hairline with no gap around it. */}
      <span
        aria-hidden
        className={clsx("absolute z-10", vertical ? "inset-x-0" : "inset-y-0")}
        style={
          vertical
            ? { top: -GRAB_OVERHANG, bottom: -GRAB_OVERHANG }
            : { left: -GRAB_OVERHANG, right: -GRAB_OVERHANG }
        }
      />
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={clsx("flex", vertical ? "h-full min-w-0 flex-col" : "min-h-0 w-full", className)}
    >
      <div
        className={clsx("shrink-0 overflow-hidden", vertical ? "min-h-0" : "min-w-0")}
        style={vertical ? { height: size } : { width: size }}
      >
        {first}
      </div>

      {handle}

      <div className={clsx("flex-1 overflow-hidden", vertical ? "min-h-0" : "min-w-0")}>
        {second}
      </div>
    </div>
  );
}
