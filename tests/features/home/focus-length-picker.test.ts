// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FocusLengthPicker } from "@/features/home/desktop/widgets/FocusLengthPicker";

vi.mock("react-i18next", async (importOriginal) => ({
	...(await importOriginal<typeof import("react-i18next")>()),
	useTranslation: () => ({
		t: (key: string) => key,
		i18n: { resolvedLanguage: "en", language: "en" },
	}),
}));

let anchor: HTMLButtonElement;

beforeEach(() => {
	// jsdom does not scroll; the wheel's position is not what is under test.
	Element.prototype.scrollTo = vi.fn();
	anchor = document.body.appendChild(document.createElement("button"));
});

afterEach(() => {
	cleanup();
	anchor.remove();
});

const renderPicker = (minutes = 25) => {
	const onChange = vi.fn();
	const onClose = vi.fn();
	render(createElement(FocusLengthPicker, { minutes, anchor, onChange, onClose }));
	return { onChange, onClose, field: screen.getByRole("spinbutton", { name: "home.timer_minutes" }) };
};

describe("focus length picker", () => {
	it("opens on the current length and takes a typed one", async () => {
		const { onChange, field } = renderPicker(25);
		expect((field as HTMLInputElement).value).toBe("25");

		await userEvent.clear(field);
		await userEvent.type(field, "50{Enter}");

		expect(onChange).toHaveBeenLastCalledWith(50);
	});

	it("keeps a typed length between 1 and 180 minutes", async () => {
		const { onChange, field } = renderPicker();

		await userEvent.clear(field);
		await userEvent.type(field, "999{Enter}");
		expect(onChange).toHaveBeenLastCalledWith(180);
		expect((field as HTMLInputElement).value).toBe("180");
	});

	it("closes on Esc and on a press outside, but not on its own button", () => {
		const { onClose } = renderPicker();

		fireEvent.pointerDown(anchor);
		expect(onClose).not.toHaveBeenCalled();

		fireEvent.pointerDown(document.body);
		expect(onClose).toHaveBeenCalledTimes(1);

		fireEvent.keyDown(document, { key: "Escape" });
		expect(onClose).toHaveBeenCalledTimes(2);
	});
});
