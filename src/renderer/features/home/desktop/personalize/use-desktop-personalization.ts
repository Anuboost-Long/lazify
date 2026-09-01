import { atom, useAtom } from "jotai";

import type { AccentColor } from "@renderer/shared/hooks/use-accent-color";

export type DesktopBackdrop = "none" | "shapes" | "grid" | "pulse" | "cursor";
export type DesktopWidgetId = "date" | "tasks" | "projects";
/** "accent" follows whatever the app's accent is set to. */
export type DesktopTint = "accent" | AccentColor;
export type DesktopIconPlacement = "center" | "left" | "right" | "top";

export interface DesktopPersonalization {
	backdrop: DesktopBackdrop;
	tint: DesktopTint;
	widgets: DesktopWidgetId[];
	icons: DesktopIconPlacement;
}

export const BACKDROP_OPTIONS: DesktopBackdrop[] = ["none", "shapes", "grid", "pulse", "cursor"];

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

export const WIDGET_OPTIONS: DesktopWidgetId[] = ["date", "tasks", "projects"];

export const ICON_PLACEMENT_OPTIONS: DesktopIconPlacement[] = ["center", "left", "right", "top"];

const STORAGE_KEY = "lazify-desktop-personalization";

const DEFAULTS: DesktopPersonalization = {
	backdrop: "shapes",
	tint: "accent",
	widgets: ["date"],
	icons: "center",
};

function readStored(): DesktopPersonalization {
	if (typeof window === "undefined") return DEFAULTS;

	try {
		const stored = globalThis.localStorage.getItem(STORAGE_KEY);
		const parsed = stored ? (JSON.parse(stored) as Partial<DesktopPersonalization>) : {};

		return {
			backdrop: BACKDROP_OPTIONS.includes(parsed.backdrop as DesktopBackdrop)
				? (parsed.backdrop as DesktopBackdrop)
				: DEFAULTS.backdrop,
			tint: TINT_OPTIONS.includes(parsed.tint as DesktopTint)
				? (parsed.tint as DesktopTint)
				: DEFAULTS.tint,
			widgets: Array.isArray(parsed.widgets)
				? parsed.widgets.filter((widget) => WIDGET_OPTIONS.includes(widget))
				: DEFAULTS.widgets,
			icons: ICON_PLACEMENT_OPTIONS.includes(parsed.icons as DesktopIconPlacement)
				? (parsed.icons as DesktopIconPlacement)
				: DEFAULTS.icons,
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

	return { personalization, update, toggleWidget };
}
