// The main build compiles without the DOM lib; this preload is the one file
// that runs in a page and needs it.
/// <reference lib="dom" />

import { ipcRenderer } from "electron";

/**
 * Two-finger swipe navigation, detected inside the page.
 *
 * It has to run here. Wheel events over a guest are routed to the window's
 * widget, so neither the guest's `input-event` in main nor a listener in the
 * app's own renderer ever sees them — the page itself is the only place the
 * gesture is observable.
 *
 * Self-contained on purpose: a sandboxed preload can require `electron` and
 * nothing relative, so the detector lives here rather than in a shared module.
 */

const SWIPE_CHANNEL = "lazify:browser-swipe";
const PROGRESS_CHANNEL = "lazify:browser-swipe-progress";

/**
 * How far a swipe must travel before it counts, in wheel pixels.
 *
 * Deliberately long. Losing the page you were reading to a stray flick while
 * scrolling costs far more than a swipe that has to be finished on purpose.
 */
const SWIPE_TRAVEL_PX = 260;

/** A pause this long ends the gesture and starts the next one. */
const GESTURE_GAP_MS = 150;

/** How much more horizontal than vertical a swipe has to be. */
const HORIZONTAL_RATIO = 3;

/**
 * How many wheel samples a swipe must span.
 *
 * A trackpad reports a gesture in dozens of small steps, so this costs a real
 * swipe nothing. What it rejects is the single enormous delta a tilt-wheel or a
 * jumpy mouse sends, which would otherwise clear the whole threshold at once.
 */
const MIN_SAMPLES = 3;

/** How long the indicator stays at full travel once the swipe has landed. */
const ARMED_HOLD_MS = 180;

const SCROLLABLE_OVERFLOW = new Set(["auto", "scroll"]);

export type SwipeDirection = "back" | "forward";

export interface SwipeProgress {
  direction: SwipeDirection;
  /** How much of the swipe is done, 0 to 1. At 1 it navigates. */
  progress: number;
  /** Wheel pixels per millisecond, which the indicator eases itself by. */
  velocity: number;
}

export interface SwipeDetector {
  /** DOM wheel deltas: fingers moving left to right report a negative `deltaX`. */
  push: (deltaX: number, deltaY: number, at: number) => SwipeProgress | null;
  /** Set once the swipe has travelled far enough to navigate. */
  isComplete: () => boolean;
  end: () => void;
}

export function createSwipeDetector(): SwipeDetector {
  let travel = 0;
  let lastEventAt = 0;
  let velocity = 0;
  let samples = 0;
  let complete = false;

  const end = () => {
    travel = 0;
    lastEventAt = 0;
    velocity = 0;
    samples = 0;
    complete = false;
  };

  return {
    push(deltaX, deltaY, at) {
      const sinceLast = at - lastEventAt;
      if (sinceLast > GESTURE_GAP_MS) end();

      // Vertical scrolling, and the diagonal drift at the start of it, is not a
      // swipe however far it goes.
      if (deltaX === 0 || Math.abs(deltaX) <= Math.abs(deltaY) * HORIZONTAL_RATIO) {
        lastEventAt = at;
        return null;
      }

      // Smoothed, so one stuttering frame does not make the indicator jump.
      const sample = Math.abs(deltaX) / Math.max(sinceLast || 16, 1);
      velocity = lastEventAt === 0 ? sample : velocity * 0.7 + sample * 0.3;

      lastEventAt = at;
      travel += deltaX;
      samples += 1;

      const progress = Math.min(1, Math.abs(travel) / SWIPE_TRAVEL_PX);
      if (progress >= 1 && samples >= MIN_SAMPLES) complete = true;

      return { direction: travel < 0 ? "back" : "forward", progress, velocity };
    },
    isComplete: () => complete,
    end
  };
}

function canScrollFurther(element: Element, deltaX: number, checkOverflow: boolean): boolean {
  const maxScrollLeft = element.scrollWidth - element.clientWidth;
  if (maxScrollLeft <= 1) return false;

  if (checkOverflow && !SCROLLABLE_OVERFLOW.has(getComputedStyle(element).overflowX)) {
    return false;
  }

  return deltaX < 0 ? element.scrollLeft > 0 : element.scrollLeft < maxScrollLeft - 1;
}

/**
 * Whether the page still has somewhere to scroll in this direction, in which
 * case the swipe belongs to the carousel or wide table under the pointer.
 */
function pageOwnsSwipe(target: EventTarget | null, deltaX: number): boolean {
  let element = target instanceof Element ? target : null;

  while (element) {
    if (canScrollFurther(element, deltaX, true)) return true;
    element = element.parentElement;
  }

  // The document scrolls without saying `overflow: auto`, so it is asked last
  // and without that test.
  const root = document.scrollingElement;
  return root ? canScrollFurther(root, deltaX, false) : false;
}

function watchForSwipes(): void {
  const detector = createSwipeDetector();
  let lastWheelAt = 0;
  let pageIsScrolling = false;
  let navigated = false;
  let restTimer: ReturnType<typeof setTimeout> | undefined;

  /** Takes the indicator down, whether the swipe navigated or was abandoned. */
  const clearIndicator = () => {
    ipcRenderer.send(PROGRESS_CHANNEL, null);
  };

  window.addEventListener(
    "wheel",
    (event) => {
      const now = Date.now();

      // Decided once per gesture: walking the tree on every wheel event would
      // be work on the busiest event a page gets.
      if (now - lastWheelAt > GESTURE_GAP_MS) {
        pageIsScrolling = pageOwnsSwipe(event.target, event.deltaX);
        detector.end();
        navigated = false;
      }
      lastWheelAt = now;

      if (pageIsScrolling) return;

      const swipe = detector.push(event.deltaX, event.deltaY, now);
      if (!swipe) return;

      // Momentum runs on for a while after the fingers lift. The gesture is
      // spent once it navigated, so the indicator goes rather than hanging
      // around over the page that is already loading.
      if (navigated) return;

      if (detector.isComplete()) {
        navigated = true;
        ipcRenderer.send(SWIPE_CHANNEL, swipe.direction);

        // Held for a moment at full travel, so the swipe is seen to land rather
        // than vanishing at the instant the page changes.
        ipcRenderer.send(PROGRESS_CHANNEL, { ...swipe, progress: 1, y: event.clientY });
        clearTimeout(restTimer);
        restTimer = setTimeout(clearIndicator, ARMED_HOLD_MS);
        return;
      }

      ipcRenderer.send(PROGRESS_CHANNEL, { ...swipe, y: event.clientY });

      clearTimeout(restTimer);
      restTimer = setTimeout(clearIndicator, GESTURE_GAP_MS);
    },
    { capture: true, passive: true }
  );
}

// Guests only, and only the page itself — an ad in an iframe does not get to
// move the tab's history.
if (typeof window !== "undefined" && window.top === window) {
  watchForSwipes();
}
