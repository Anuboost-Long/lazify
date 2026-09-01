import { describe, expect, it } from "vitest";

import {
	clampFrame,
	defaultFrame,
	MIN_HEIGHT,
	MIN_WIDTH,
} from "../../src/renderer/features/home/desktop/windows/window-frame";

/**
 * A window that has been dragged off the pane cannot be dragged back, so the
 * clamp is the one piece of this that has to hold in every direction.
 */
const bounds = { width: 1200, height: 800 };

const frame = (overrides: Partial<ReturnType<typeof defaultFrame>> = {}) => ({
	x: 100,
	y: 100,
	width: 600,
	height: 400,
	...overrides,
});

describe("clampFrame", () => {
	it("keeps a sliver of the title bar reachable on every edge", () => {
		const farRight = clampFrame(frame({ x: 5000 }), bounds);
		expect(farRight.x).toBeLessThanOrEqual(bounds.width - 140);

		const farLeft = clampFrame(frame({ x: -5000 }), bounds);
		expect(farLeft.x + farLeft.width).toBeGreaterThanOrEqual(140);

		const farDown = clampFrame(frame({ y: 5000 }), bounds);
		expect(farDown.y).toBeLessThan(bounds.height);

		expect(clampFrame(frame({ y: -400 }), bounds).y).toBe(0);
	});

	it("refuses a window too small to use, or larger than the desktop", () => {
		const tiny = clampFrame(frame({ width: 10, height: 10 }), bounds);
		expect(tiny.width).toBe(MIN_WIDTH);
		expect(tiny.height).toBe(MIN_HEIGHT);

		const huge = clampFrame(frame({ width: 9000, height: 9000 }), bounds);
		expect(huge.width).toBe(bounds.width);
		expect(huge.height).toBe(bounds.height);
	});
});

describe("defaultFrame", () => {
	it("opens both windows on screen, cascaded rather than stacked", () => {
		const tasks = defaultFrame("tasks", bounds);
		const projects = defaultFrame("projects", bounds);

		expect(tasks).toEqual(clampFrame(tasks, bounds));
		expect(projects).toEqual(clampFrame(projects, bounds));
		expect(projects.x).not.toBe(tasks.x);
	});

	it("fits a desktop smaller than the window it wanted", () => {
		const cramped = { width: 420, height: 300 };
		const tasks = defaultFrame("tasks", cramped);

		expect(tasks.width).toBeLessThanOrEqual(cramped.width);
		expect(tasks.height).toBeLessThanOrEqual(cramped.height);
	});
});
