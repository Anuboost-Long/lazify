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
	it("starts at 25 minutes and takes any whole number of minutes while idle", () => {
		const { result } = renderTimer();
		expect(formatCountdown(result.current.remainingMs)).toBe("25:00");
		expect(result.current.idle).toBe(true);

		act(() => result.current.setMinutes(42));
		expect(formatCountdown(result.current.remainingMs)).toBe("42:00");
		expect(result.current.minutes).toBe(42);
	});

	it("stays between 1 minute and 23 hours 59 minutes", () => {
		const { result } = renderTimer();

		act(() => result.current.setMinutes(0));
		expect(result.current.minutes).toBe(1);

		act(() => result.current.setMinutes(5000));
		expect(result.current.minutes).toBe(23 * 60 + 59);
	});

	it("shows hours once the length passes an hour", () => {
		expect(formatCountdown(90 * 60 * 1000)).toBe("1:30:00");
		expect(formatCountdown(59 * 60 * 1000 + 5000)).toBe("59:05");
	});

	it("is no longer idle once started, and reset returns to the chosen length", () => {
		const { result } = renderTimer();
		act(() => result.current.setMinutes(30));

		act(() => result.current.start());
		expect(result.current.idle).toBe(false);

		act(() => result.current.reset());
		expect(result.current.idle).toBe(true);
		expect(formatCountdown(result.current.remainingMs)).toBe("30:00");
	});
});
