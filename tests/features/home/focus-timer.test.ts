// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";

import { formatCountdown, useFocusTimer } from "@/features/home/desktop/widgets/use-focus-timer";

const now = new Date("2026-10-18T09:00:00.000Z");

function renderTimer() {
	const store = createStore();
	return renderHook(() => useFocusTimer(now), {
		wrapper: ({ children }: { children: ReactNode }) => createElement(Provider, { store }, children),
	});
}

beforeEach(() => localStorage.clear());

describe("focus timer length", () => {
	it("starts at 25 minutes and changes in 5-minute steps while idle", () => {
		const { result } = renderTimer();
		expect(formatCountdown(result.current.remainingMs)).toBe("25:00");
		expect(result.current.idle).toBe(true);

		act(() => result.current.adjust(1));
		expect(formatCountdown(result.current.remainingMs)).toBe("30:00");

		act(() => result.current.adjust(-1));
		act(() => result.current.adjust(-1));
		expect(formatCountdown(result.current.remainingMs)).toBe("20:00");
	});

	it("stays between 5 minutes and 2 hours", () => {
		const { result } = renderTimer();

		for (let step = 0; step < 10; step++) act(() => result.current.adjust(-1));
		expect(formatCountdown(result.current.remainingMs)).toBe("5:00");
		expect(result.current.canShorten).toBe(false);

		for (let step = 0; step < 40; step++) act(() => result.current.adjust(1));
		expect(formatCountdown(result.current.remainingMs)).toBe("120:00");
		expect(result.current.canLengthen).toBe(false);
	});

	it("is no longer idle once started, and reset returns to the chosen length", () => {
		const { result } = renderTimer();
		act(() => result.current.adjust(1));

		act(() => result.current.start());
		expect(result.current.idle).toBe(false);

		act(() => result.current.reset());
		expect(result.current.idle).toBe(true);
		expect(formatCountdown(result.current.remainingMs)).toBe("30:00");
	});
});
