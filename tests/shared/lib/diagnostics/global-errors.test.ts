// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const logged: unknown[][] = [];

vi.mock("@/shared/lib/diagnostics/logger", () => ({
	logError: (...args: unknown[]) => {
		logged.push(args);
		return Promise.resolve();
	},
}));

const { getFatalError, installGlobalErrorLogging, onFatalError, resetFatalErrorForTests } =
	await import("@/shared/lib/diagnostics/global-errors");

beforeEach(() => {
	logged.length = 0;
	resetFatalErrorForTests();
	installGlobalErrorLogging();
});

afterEach(() => {
	resetFatalErrorForTests();
});

describe("installGlobalErrorLogging", () => {
	it("logs and shows the first uncaught error", () => {
		const seen: unknown[] = [];
		const unsubscribe = onFatalError((error) => seen.push(error));

		globalThis.dispatchEvent(
			Object.assign(new Event("error"), { message: "boom", error: new Error("boom") }),
		);

		expect(seen).toHaveLength(1);
		expect(getFatalError()?.message).toBe("boom");
		expect(logged).toHaveLength(1);
		expect(logged[0][1]).toBe("boom");

		unsubscribe();
	});

	it("logs an unhandled rejection but never shows it — usually a failed fetch or an unported feature, not a broken window", () => {
		const seen: unknown[] = [];
		onFatalError((error) => seen.push(error));

		globalThis.dispatchEvent(Object.assign(new Event("unhandledrejection"), { reason: "nope" }));

		expect(seen).toHaveLength(0);
		expect(getFatalError()).toBeNull();
		expect(logged).toEqual([["window", "Unhandled rejection", "nope"]]);
	});

	it("does not show a second error once one is already shown, but still logs it", () => {
		const seen: unknown[] = [];
		onFatalError((error) => seen.push(error));

		globalThis.dispatchEvent(
			Object.assign(new Event("error"), { message: "first", error: new Error("first") }),
		);
		globalThis.dispatchEvent(
			Object.assign(new Event("error"), { message: "second", error: new Error("second") }),
		);

		expect(seen).toHaveLength(1);
		expect(getFatalError()?.message).toBe("first");
		expect(logged).toHaveLength(2);
		expect(logged[1][1]).toContain("second");
	});

	it("installs its listeners only once even if called again", () => {
		installGlobalErrorLogging();

		const seen: unknown[] = [];
		onFatalError((error) => seen.push(error));

		globalThis.dispatchEvent(
			Object.assign(new Event("error"), { message: "once", error: new Error("once") }),
		);

		expect(seen).toHaveLength(1);
		expect(logged).toHaveLength(1);
	});
});
