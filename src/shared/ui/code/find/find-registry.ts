/**
 * Cmd/Ctrl+F belongs to the code panel the reader is in, but a panel being read
 * usually holds no focus at all — the file was opened from the explorer, and the
 * keystroke lands on the window. So every surface registers itself here and one
 * shared listener hands the shortcut to the panel that holds focus, else the one
 * last clicked into, else the newest one mounted (a modal over a pane).
 */

export interface FindTarget {
  /** Read late: the element only exists once the surface has rendered. */
  element: () => HTMLElement | null;
  open: () => void;
}

const targets: FindTarget[] = [];
let lastTouched: FindTarget | null = null;

/** Cmd on macOS, Ctrl everywhere else — the split every editor uses for this. */
const IS_MAC = navigator.userAgent.includes("Mac OS X");

/** A panel on another route is still mounted; the shortcut is not its to take. */
function isShowing(target: FindTarget) {
  const element = target.element();

  return Boolean(element?.isConnected) && (element?.getClientRects().length ?? 0) > 0;
}

function pick(): FindTarget | null {
  const showing = targets.filter(isShowing);
  const active = document.activeElement;

  if (active) {
    const focused = showing.find((target) => target.element()?.contains(active));
    if (focused) return focused;
  }

  if (lastTouched && showing.includes(lastTouched)) return lastTouched;

  return showing.at(-1) ?? null;
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key !== "f" && event.key !== "F") return;
  if (IS_MAC ? !event.metaKey || event.ctrlKey : !event.ctrlKey || event.metaKey) return;

  const target = pick();
  if (!target) return;

  // The browser's own find would search the whole window, including the tree and
  // the chrome around the code.
  event.preventDefault();
  target.open();
}

function onPointerDown(event: PointerEvent) {
  const node = event.target;
  if (!(node instanceof Node)) return;

  const touched = targets.find((target) => target.element()?.contains(node));
  if (touched) lastTouched = touched;
}

export function registerFindTarget(target: FindTarget): () => void {
  targets.push(target);

  if (targets.length === 1) {
    globalThis.addEventListener("keydown", onKeyDown);
    globalThis.addEventListener("pointerdown", onPointerDown, true);
  }

  return () => {
    const index = targets.indexOf(target);
    if (index >= 0) targets.splice(index, 1);
    if (lastTouched === target) lastTouched = null;

    if (targets.length === 0) {
      globalThis.removeEventListener("keydown", onKeyDown);
      globalThis.removeEventListener("pointerdown", onPointerDown, true);
    }
  };
}
