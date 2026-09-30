import { atom, useAtom } from "jotai";

import {
	CLOCK_STYLE_OPTIONS,
	type ClockStyleId,
} from "@renderer/features/settings/components/settings-config";
import type { AccentColor } from "@renderer/shared/hooks/use-accent-color";

export type DesktopBackdrop = "none" | "shapes" | "grid" | "cursor" | "rain";
export type DesktopWidgetId = "date" | "tasks" | "projects" | "agents" | "git" | "timer" | "note";
/** "accent" follows whatever the app's accent is set to. */
export type DesktopTint = "accent" | AccentColor;
export type DesktopIconPlacement = "center" | "left" | "right" | "top";
export type DesktopClockSize = "compact" | "regular" | "large";

export interface DesktopPersonalization {
	backdrop: DesktopBackdrop;
	tint: DesktopTint;
	widgets: DesktopWidgetId[];
	icons: DesktopIconPlacement;
	clockSize: DesktopClockSize;
	greeting: boolean;
	/** Who the greeting addresses. Empty greets without a name. */
	name: string;
	/** An IANA time zone shown beside the local clock, or null for none. */
	secondZone: string | null;
	/** Shortcut ids in the order they sit on the desktop; ids missing here keep their default place after these. */
	shortcutOrder: string[];
	hiddenShortcuts: string[];
	/** Everything but the clock and background is put away. */
	focus: boolean;
	looks: DesktopLook[];
}

export type DesktopLookSettings = Omit<DesktopPersonalization, "focus" | "looks">;

export interface DesktopLook {
	name: string;
	clockStyle: ClockStyleId;
	settings: DesktopLookSettings;
}

export const BACKDROP_OPTIONS: DesktopBackdrop[] = ["none", "shapes", "grid", "cursor", "rain"];

export const TINT_OPTIONS: DesktopTint[] = [
	"accent",
	"emerald",
	"sky",
	"violet",
	"rose",
	"amber",
	"cyan",
	"pink",
	"indigo",
];

export const WIDGET_OPTIONS: DesktopWidgetId[] = [
	"date",
	"tasks",
	"projects",
	"agents",
	"git",
	"timer",
	"note",
];

export const ICON_PLACEMENT_OPTIONS: DesktopIconPlacement[] = ["center", "left", "right", "top"];

export const CLOCK_SIZE_OPTIONS: DesktopClockSize[] = ["compact", "regular", "large"];

export const SECOND_ZONE_OPTIONS = [
	"America/Los_Angeles",
	"America/New_York",
	"Europe/London",
	"Europe/Berlin",
	"Asia/Dubai",
	"Asia/Kolkata",
	"Asia/Phnom_Penh",
	"Asia/Shanghai",
	"Asia/Tokyo",
	"Australia/Sydney",
];

/** The shortcut that opens this panel, which can never be hidden or the way back is lost. */
export const CUSTOMIZE_SHORTCUT_ID = "customize";

const STORAGE_KEY = "lazify-desktop-personalization";

const DEFAULTS: DesktopPersonalization = {
	backdrop: "shapes",
	tint: "accent",
	widgets: ["date"],
	icons: "center",
	clockSize: "regular",
	greeting: false,
	name: "",
	secondZone: null,
	shortcutOrder: [],
	hiddenShortcuts: [],
	focus: false,
	looks: [],
};

function oneOf<T>(value: unknown, options: readonly T[], fallback: T): T {
	return options.includes(value as T) ? (value as T) : fallback;
}

function strings(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

function readSettings(parsed: Partial<DesktopLookSettings>): DesktopLookSettings {
	// "pulse" was the CSS-ring water effect that rain replaced.
	const backdrop = (parsed.backdrop as string | undefined) === "pulse" ? "rain" : parsed.backdrop;

	return {
		backdrop: oneOf(backdrop, BACKDROP_OPTIONS, DEFAULTS.backdrop),
		tint: oneOf(parsed.tint, TINT_OPTIONS, DEFAULTS.tint),
		widgets: Array.isArray(parsed.widgets)
			? parsed.widgets.filter((widget) => WIDGET_OPTIONS.includes(widget))
			: DEFAULTS.widgets,
		icons: oneOf(parsed.icons, ICON_PLACEMENT_OPTIONS, DEFAULTS.icons),
		clockSize: oneOf(parsed.clockSize, CLOCK_SIZE_OPTIONS, DEFAULTS.clockSize),
		greeting: parsed.greeting === true,
		name: typeof parsed.name === "string" ? parsed.name : DEFAULTS.name,
		secondZone: oneOf(parsed.secondZone, SECOND_ZONE_OPTIONS, DEFAULTS.secondZone),
		shortcutOrder: strings(parsed.shortcutOrder),
		hiddenShortcuts: strings(parsed.hiddenShortcuts).filter((id) => id !== CUSTOMIZE_SHORTCUT_ID),
	};
}

function readLooks(value: unknown): DesktopLook[] {
	if (!Array.isArray(value)) return [];

	return value
		.filter((look): look is DesktopLook => typeof look?.name === "string" && Boolean(look.settings))
		.map((look) => ({
			name: look.name,
			clockStyle: oneOf(
				look.clockStyle,
				CLOCK_STYLE_OPTIONS.map((option) => option.id),
				CLOCK_STYLE_OPTIONS[0].id,
			),
			settings: readSettings(look.settings),
		}));
}

function readStored(): DesktopPersonalization {
	if (typeof window === "undefined") return DEFAULTS;

	try {
		const stored = globalThis.localStorage.getItem(STORAGE_KEY);
		const parsed = stored ? (JSON.parse(stored) as Partial<DesktopPersonalization>) : {};

		return {
			...readSettings(parsed),
			focus: parsed.focus === true,
			looks: readLooks(parsed.looks),
		};
	} catch {
		// A remembered look is a convenience, never a reason to fail.
		return DEFAULTS;
	}
}

const personalizationAtom = atom<DesktopPersonalization>(readStored());

export function useDesktopPersonalization() {
	const [personalization, setPersonalizationAtom] = useAtom(personalizationAtom);

	const update = (patch: Partial<DesktopPersonalization>) => {
		const next = { ...personalization, ...patch };

		setPersonalizationAtom(next);

		try {
			globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
		} catch {
			// Private windows and cleared site data both land here.
		}
	};

	const toggleWidget = (widget: DesktopWidgetId) =>
		update({
			widgets: personalization.widgets.includes(widget)
				? personalization.widgets.filter((current) => current !== widget)
				: [...personalization.widgets, widget],
		});

	const saveLook = (name: string, clockStyle: ClockStyleId) => {
		const { focus: _focus, looks, ...settings } = personalization;

		update({
			looks: [...looks.filter((look) => look.name !== name), { name, clockStyle, settings }],
		});
	};

	const deleteLook = (name: string) =>
		update({ looks: personalization.looks.filter((look) => look.name !== name) });

	return { personalization, update, toggleWidget, saveLook, deleteLook };
}

/** Puts shortcuts in the order the person chose, with any they have not placed after, in their default order. */
export function arrangeShortcuts<T extends { id: string }>(shortcuts: T[], order: string[]): T[] {
	const rank = (id: string) => {
		const at = order.indexOf(id);
		return at === -1 ? order.length : at;
	};

	return shortcuts
		.map((shortcut, index) => ({ shortcut, index }))
		.sort((a, b) => rank(a.shortcut.id) - rank(b.shortcut.id) || a.index - b.index)
		.map(({ shortcut }) => shortcut);
}
