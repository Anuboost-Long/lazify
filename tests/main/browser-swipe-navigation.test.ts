import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ ipcRenderer: { send: vi.fn() } }));

import { createSwipeDetector } from "../../src/preload/browser-gesture";

/**
 * Feeds a gesture in the small steps a trackpad actually reports. DOM wheel
 * deltas run the opposite way to the fingers: left to right is negative.
 */
function swipe(deltaX: number, deltaY = 0, steps = 8) {
  const detector = createSwipeDetector();
  const at = 1_000;
  let direction: string | null = null;

  for (let step = 0; step < steps; step += 1) {
    const swiped = detector.push(deltaX / steps, deltaY / steps, at + step * 16);
    if (swiped && detector.isComplete()) direction = swiped.direction;
  }

  return { detector, direction };
}

describe("a two-finger swipe over a page", () => {
  it("goes back when the fingers move left to right", () => {
    expect(swipe(-400).direction).toBe("back");
  });

  it("goes forward when they move right to left", () => {
    expect(swipe(400).direction).toBe("forward");
  });

  it("ignores a nudge that never travels far enough", () => {
    expect(swipe(-120).direction).toBeNull();
  });

  it("ignores a swipe that stops just short of the threshold", () => {
    expect(swipe(-250).direction).toBeNull();
  });

  it("ignores scrolling down a long page", () => {
    expect(swipe(-120, 400).direction).toBeNull();
  });

  it("ignores a diagonal drag, which is someone scrolling", () => {
    // Well past the distance, but only twice as horizontal as it is vertical.
    expect(swipe(-400, 200).direction).toBeNull();
  });

  it("refuses to navigate on one enormous delta", () => {
    const detector = createSwipeDetector();
    const jump = detector.push(-900, 0, 1_000);

    expect(jump?.progress).toBe(1);
    expect(detector.isComplete()).toBe(false);
  });

  it("reports how far along a swipe under way is", () => {
    const detector = createSwipeDetector();

    // The threshold is 260px, so 130 is halfway there.
    const halfway = detector.push(-130, 0, 1_000);

    expect(halfway?.progress).toBeCloseTo(0.5);
    expect(detector.isComplete()).toBe(false);
  });

  it("measures how fast the fingers are moving", () => {
    const slow = createSwipeDetector().push(-16, 0, 1_000);
    const fast = createSwipeDetector();
    fast.push(-16, 0, 1_000);
    const quick = fast.push(-64, 0, 1_008);

    expect(quick?.velocity).toBeGreaterThan(slow?.velocity ?? 0);
  });

  it("starts a new gesture after the fingers lift", () => {
    const detector = createSwipeDetector();

    for (let step = 0; step < 8; step += 1) detector.push(-50, 0, 1_000 + step * 16);
    detector.end();

    expect(detector.isComplete()).toBe(false);
    expect(detector.push(-52, 0, 2_000)?.progress).toBeCloseTo(0.2);
  });

  it("does not add up two swipes separated by a pause", () => {
    const detector = createSwipeDetector();

    detector.push(-200, 0, 1_000);
    // A second before the next event: a different gesture, not the same one.
    detector.push(-200, 0, 2_000);

    expect(detector.isComplete()).toBe(false);
  });
});
