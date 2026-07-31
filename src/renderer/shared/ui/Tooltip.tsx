import clsx from "clsx";
import {
  cloneElement,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode
} from "react";
import { createPortal } from "react-dom";

import { useInterfaceSettings } from "@renderer/shared/hooks/use-interface-settings";

/**
 * The app's tooltip.
 *
 * Replaces the native `title` attribute, which was the wrong tool for two
 * reasons. It ignores the *Show tooltips* setting entirely — that switch only
 * ever reached the collapsed sidebar rail, so turning it off changed nothing
 * anywhere else — and it takes about a second to appear, unstyled, which is long
 * enough that a truncated label reads as simply unreadable.
 *
 * Rendered into `document.body` rather than beside the trigger: every surface
 * that needs one (the sidebar, the agent rail, the editor tab strip) clips its
 * own overflow, and a bubble drawn inside them would be cut off by the thing it
 * is explaining.
 *
 * Attaches to whatever single element it is given, adding no DOM of its own, so
 * dropping it around an existing button cannot disturb a layout.
 */

/** Long enough not to fire while the pointer crosses a rail, short enough to feel immediate. */
const OPEN_DELAY_MS = 260;

/** Gap between the trigger and the bubble. */
const OFFSET = 8;

/** Keeps the bubble on screen when the trigger is near an edge. */
const VIEWPORT_MARGIN = 8;

export type TooltipSide = "top" | "right" | "bottom" | "left";

interface TooltipProps {
  /** Usually a string; a fragment when a row needs a title over a description. */
  content: ReactNode;
  /** Which way to open. Rails want `right`; toolbars usually want `top`. */
  side?: TooltipSide;
  /** The element the tooltip describes. Handlers are composed, not replaced. */
  children: ReactElement;
}

interface Position {
  left: number;
  top: number;
  /** Set once measured, so the first paint is not a flash in the wrong place. */
  transform: string;
}

function place(rect: DOMRect, side: TooltipSide): Position {
  switch (side) {
    case "right":
      return {
        left: rect.right + OFFSET,
        top: rect.top + rect.height / 2,
        transform: "translateY(-50%)"
      };
    case "left":
      return {
        left: rect.left - OFFSET,
        top: rect.top + rect.height / 2,
        transform: "translate(-100%, -50%)"
      };
    case "bottom":
      return {
        left: rect.left + rect.width / 2,
        top: rect.bottom + OFFSET,
        transform: "translateX(-50%)"
      };
    default:
      return {
        left: rect.left + rect.width / 2,
        top: rect.top - OFFSET,
        transform: "translate(-50%, -100%)"
      };
  }
}

export function Tooltip({ content, side = "top", children }: Readonly<TooltipProps>) {
  const { showTooltips } = useInterfaceSettings();
  const [position, setPosition] = useState<Position | null>(null);
  // `ReturnType` rather than `number`: the renderer's tsconfig pulls in the node
  // typings, where the browser's timer id is a `Timeout` object.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubble = useRef<HTMLDivElement | null>(null);

  const cancel = () => {
    if (timer.current !== null) {
      globalThis.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  useEffect(() => cancel, []);

  // Nudge the bubble back inside the window once its real size is known. Doing
  // this after mount rather than guessing keeps long content — a full sidebar
  // description — from hanging off the right edge.
  useEffect(() => {
    const node = bubble.current;
    if (!node || !position) return;

    const rect = node.getBoundingClientRect();
    const overflowRight = rect.right - (globalThis.innerWidth - VIEWPORT_MARGIN);
    const overflowBottom = rect.bottom - (globalThis.innerHeight - VIEWPORT_MARGIN);
    const shiftX = Math.max(0, overflowRight) + Math.min(0, rect.left - VIEWPORT_MARGIN);
    const shiftY = Math.max(0, overflowBottom) + Math.min(0, rect.top - VIEWPORT_MARGIN);

    if (shiftX === 0 && shiftY === 0) return;

    setPosition({
      ...position,
      left: position.left - shiftX,
      top: position.top - shiftY
    });
    // Only re-run when a fresh open moved the bubble, never on its own correction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position?.left, position?.top]);

  // Off by preference, or nothing to say: hand the child back untouched. No
  // handlers, no portal, no cost.
  if (!showTooltips || content == null || content === "") return children;

  const open = (event: MouseEvent | FocusEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();

    cancel();
    timer.current = globalThis.setTimeout(() => setPosition(place(rect, side)), OPEN_DELAY_MS);
  };

  const close = () => {
    cancel();
    setPosition(null);
  };

  const childProps = children.props as {
    onMouseEnter?: (event: MouseEvent) => void;
    onMouseLeave?: (event: MouseEvent) => void;
    onFocus?: (event: FocusEvent) => void;
    onBlur?: (event: FocusEvent) => void;
    onClick?: (event: MouseEvent) => void;
    disabled?: boolean;
  };

  const handlers = {
    onMouseEnter: (event: MouseEvent) => {
      childProps.onMouseEnter?.(event);
      open(event);
    },
    onMouseLeave: (event: MouseEvent) => {
      childProps.onMouseLeave?.(event);
      close();
    },
    // Keyboard users get the same explanation; focus is their hover.
    onFocus: (event: FocusEvent) => {
      childProps.onFocus?.(event);
      open(event);
    },
    onBlur: (event: FocusEvent) => {
      childProps.onBlur?.(event);
      close();
    },
    // A tooltip left hanging over the thing that was just pressed is stale by
    // definition — the click usually changes what is on screen.
    onClick: (event: MouseEvent) => {
      childProps.onClick?.(event);
      close();
    }
  };

  const bubbleNode = position
    ? createPortal(
        <div
          ref={bubble}
          role="tooltip"
          style={{ left: position.left, top: position.top, transform: position.transform }}
          className={clsx(
            "pointer-events-none fixed z-[60] max-w-xs",
            "border border-border rounded-lg bg-soft px-2.5 py-1.5 shadow-panel",
            "text-xs leading-snug text-text",
            "animate-fadeIn"
          )}
        >
          {content}
        </div>,
        document.body
      )
    : null;

  // A disabled control receives no mouse events at all in Chromium, and the
  // disabled case is usually the one that needs explaining — why the button
  // cannot be pressed. So that one gets a wrapper to listen on, which is what
  // the native attribute was quietly doing all along.
  if (childProps.disabled) {
    return (
      <span className="inline-flex" {...handlers}>
        {children}
        {bubbleNode}
      </span>
    );
  }

  return (
    <>
      {cloneElement(children, handlers as Partial<typeof childProps>)}
      {bubbleNode}
    </>
  );
}
