import clsx from "clsx";

import type { SwipeProgressEvent } from "@main/browser/swipe-navigation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface SwipeNavigationIndicatorProps {
  swipe: SwipeProgressEvent | null;
  canGoBack: boolean;
  canGoForward: boolean;
}

/** Chip size and how far in from the edge it comes to rest, in pixels. */
const CHIP_PX = 44;
const RESTING_INSET_PX = 14;

/** A fast flick throws the chip a little further than a slow drag. */
const MAX_LEAD_PX = 10;

/** Slows down as it arrives, the way a page being dragged does. */
const easeOut = (progress: number) => 1 - (1 - progress) ** 2;

/**
 * The affordance for a two-finger swipe: a chip that comes in from the edge the
 * page would arrive from, tracking the fingers rather than playing an animation
 * at them.
 *
 * Everything it does is a function of the gesture — how far it has gone, how
 * fast, and where on the page it is — so letting go halfway leaves it halfway,
 * which is what tells the user the swipe is theirs to abandon.
 */
export function SwipeNavigationIndicator({
  swipe,
  canGoBack,
  canGoForward
}: Readonly<SwipeNavigationIndicatorProps>) {
  if (!swipe) return null;

  const goingBack = swipe.direction === "back";

  // Nothing to promise when there is nowhere to go.
  if (goingBack ? !canGoBack : !canGoForward) return null;

  const eased = easeOut(swipe.progress);
  const lead = Math.min(MAX_LEAD_PX, swipe.velocity * 6);
  const travel = -CHIP_PX + eased * (CHIP_PX + RESTING_INSET_PX + lead);
  const armed = swipe.progress >= 1;

  // Between two wheel samples, not an animation of its own: the faster the
  // fingers move, the less there is to smooth over.
  const settleMs = Math.max(60, Math.min(160, 160 - swipe.velocity * 60));

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <div
        className={clsx(
          "absolute flex items-center justify-center rounded-full border backdrop-blur-sm",
          armed
            ? "border-accent bg-accent/15 text-accent"
            : "border-border bg-soft/95 text-muted"
        )}
        style={{
          height: CHIP_PX,
          width: CHIP_PX,
          top: swipe.y,
          [goingBack ? "left" : "right"]: 0,
          opacity: Math.min(1, swipe.progress * 2),
          transform: [
            `translateY(-50%)`,
            `translateX(${goingBack ? travel : -travel}px)`,
            `scale(${0.85 + eased * 0.15 + (armed ? 0.08 : 0)})`
          ].join(" "),
          transition: `transform ${settleMs}ms ease-out, opacity ${settleMs}ms ease-out`
        }}
      >
        <UiIcon name={goingBack ? "arrow-left" : "arrow-right"} className="h-5 w-5" />
      </div>
    </div>
  );
}
