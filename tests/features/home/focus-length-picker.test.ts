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
	return {
		onChange,
		onClose,
		hours: screen.getByRole("spinbutton", { name: "home.timer_hours" }) as HTMLInputElement,
		minutesField: screen.getByRole("spinbutton", { name: "home.timer_minutes" }) as HTMLInputElement,
	};
};

const retype = async (field: HTMLElement, value: string) => {
	await userEvent.clear(field);
	await userEvent.type(field, `${value}{Enter}`);
};

describe("focus length picker", () => {
	it("opens on the current length split into hours and minutes", () => {
		const { hours, minutesField } = renderPicker(95);

		expect(hours.value).toBe("1");
		expect(minutesField.value).toBe("35");
	});

	it("sets hours and minutes typed separately", async () => {
		const { onChange, hours, minutesField } = renderPicker(25);

		await retype(hours, "2");
		expect(onChange).toHaveBeenLastCalledWith(145);

		await retype(minutesField, "5");
		expect(onChange).toHaveBeenLastCalledWith(125);
	});

	it("keeps each field in range, and never sets no time at all", async () => {
		const { onChange, hours, minutesField } = renderPicker(25);

		await retype(minutesField, "99");
		expect(minutesField.value).toBe("59");

		await retype(hours, "0");
		await retype(minutesField, "0");
		expect(onChange).toHaveBeenLastCalledWith(1);
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
