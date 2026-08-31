import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { CLOCK_STYLE_OPTIONS } from "@renderer/features/settings/components/settings-config";
import { translation } from "@renderer/i18n/translation";
import { useClockStyle } from "@renderer/shared/hooks/use-clock-style";
import { CaptionText, OverlineText } from "@renderer/shared/typography";

import {
	BACKDROP_OPTIONS,
	TINT_OPTIONS,
	WIDGET_OPTIONS,
	useDesktopPersonalization,
	type DesktopBackdrop,
	type DesktopWidgetId,
} from "./use-desktop-personalization";

const BACKDROP_LABELS: Record<DesktopBackdrop, string> = {
	none: translation.Home.BackdropNone,
	shapes: translation.Home.BackdropShapes,
	grid: translation.Home.BackdropGrid,
	pulse: translation.Home.BackdropPulse,
	cursor: translation.Home.BackdropCursor,
};

const WIDGET_LABELS: Record<DesktopWidgetId, string> = {
	date: translation.Home.WidgetDate,
	tasks: translation.Home.WidgetTasks,
	projects: translation.Home.WidgetProjects,
};

function Section({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
	return (
		<section className="border-b border-border px-4 py-3.5 last:border-b-0">
			<OverlineText className="mb-2.5 block text-muted">{title}</OverlineText>
			{children}
		</section>
	);
}

function Choice({
	label,
	selected,
	onSelect,
}: Readonly<{ label: string; selected: boolean; onSelect: () => void }>) {
	return (
		<button
			type="button"
			onClick={onSelect}
			aria-pressed={selected}
			className={clsx(
				"rounded-[10px] border px-3 py-1.5 text-xs font-semibold transition-colors",
				selected
					? "border-accent/40 bg-accent/10 text-accent"
					: "border-border bg-transparent text-muted hover:text-text",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accentSoft",
			)}
		>
			{label}
		</button>
	);
}

export function CustomizePanel() {
	const { t } = useTranslation();
	const { personalization, update, toggleWidget } = useDesktopPersonalization();
	const { clockStyle, setClockStyle } = useClockStyle();

	return (
		<div className="flex flex-col">
			<Section title={t(translation.Home.CustomizeBackdrop)}>
				<div className="flex flex-wrap gap-1.5">
					{BACKDROP_OPTIONS.map((backdrop) => (
						<Choice
							key={backdrop}
							label={t(BACKDROP_LABELS[backdrop])}
							selected={personalization.backdrop === backdrop}
							onSelect={() => update({ backdrop })}
						/>
					))}
				</div>
			</Section>

			<Section title={t(translation.Home.CustomizeClock)}>
				<div className="flex flex-wrap gap-1.5">
					{CLOCK_STYLE_OPTIONS.map((option) => (
						<Choice
							key={option.id}
							label={option.label}
							selected={clockStyle === option.id}
							onSelect={() => setClockStyle(option.id)}
						/>
					))}
				</div>
			</Section>

			<Section title={t(translation.Home.CustomizeColour)}>
				<div className="flex flex-wrap items-center gap-2">
					{TINT_OPTIONS.map((tint) => (
						<button
							key={tint}
							type="button"
							onClick={() => update({ tint })}
							aria-label={tint}
							aria-pressed={personalization.tint === tint}
							data-desktop-tint={tint === "accent" ? undefined : tint}
							className={clsx(
								"h-7 w-7 rounded-full border-2 transition-transform",
								personalization.tint === tint
									? "scale-110 border-text"
									: "border-transparent hover:scale-105",
								tint === "accent" ? "bg-transparent" : "bg-accent",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accentSoft",
							)}
						>
							{tint === "accent" ? (
								<span className="block h-full w-full rounded-full border border-dashed border-muted" />
							) : null}
						</button>
					))}
				</div>
				<CaptionText tone="muted" className="mt-2">
					{t(translation.Home.CustomizeColourHint)}
				</CaptionText>
			</Section>

			<Section title={t(translation.Home.CustomizeWidgets)}>
				<div className="flex flex-wrap gap-1.5">
					{WIDGET_OPTIONS.map((widget) => (
						<Choice
							key={widget}
							label={t(WIDGET_LABELS[widget])}
							selected={personalization.widgets.includes(widget)}
							onSelect={() => toggleWidget(widget)}
						/>
					))}
				</div>
			</Section>
		</div>
	);
}
