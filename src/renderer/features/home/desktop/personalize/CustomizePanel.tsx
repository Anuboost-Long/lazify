import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CLOCK_STYLE_OPTIONS } from "@renderer/features/settings/components/settings-config";
import { translation } from "@renderer/i18n/translation";
import { useClockStyle } from "@renderer/shared/hooks/use-clock-style";
import { CaptionText, OverlineText } from "@renderer/shared/typography";
import { SelectInput, TextInput } from "@renderer/shared/ui/form/FormInput";
import { IconButton } from "@renderer/shared/ui/IconButton";
import { LabelButton } from "@renderer/shared/ui/LabelButton";
import { SegmentedTabs, type SegmentedTab } from "@renderer/shared/ui/SegmentedTabs";
import { Switch } from "@renderer/shared/ui/Switch";

import { zoneCity } from "../clock/DesktopClock";
import type { DesktopShortcut } from "../HomeDesktop";
import {
	arrangeShortcuts,
	BACKDROP_OPTIONS,
	CLOCK_SIZE_OPTIONS,
	CUSTOMIZE_SHORTCUT_ID,
	ICON_PLACEMENT_OPTIONS,
	SECOND_ZONE_OPTIONS,
	TINT_OPTIONS,
	WIDGET_OPTIONS,
	useDesktopPersonalization,
	type DesktopBackdrop,
	type DesktopClockSize,
	type DesktopIconPlacement,
	type DesktopWidgetId,
} from "./use-desktop-personalization";

const BACKDROP_LABELS: Record<DesktopBackdrop, string> = {
	none: translation.Home.BackdropNone,
	shapes: translation.Home.BackdropShapes,
	grid: translation.Home.BackdropGrid,
	cursor: translation.Home.BackdropCursor,
	rain: translation.Home.BackdropRain,
};

const ICON_PLACEMENT_LABELS: Record<DesktopIconPlacement, string> = {
	center: translation.Home.IconsCenter,
	left: translation.Home.IconsLeft,
	right: translation.Home.IconsRight,
	top: translation.Home.IconsTop,
};

const WIDGET_LABELS: Record<DesktopWidgetId, string> = {
	date: translation.Home.WidgetDate,
	tasks: translation.Home.WidgetTasks,
	projects: translation.Home.WidgetProjects,
	agents: translation.Home.WidgetAgents,
	git: translation.Home.WidgetGit,
	timer: translation.Home.WidgetTimer,
	note: translation.Home.WidgetNote,
};

const CLOCK_SIZE_LABELS: Record<DesktopClockSize, string> = {
	compact: translation.Home.ClockSizeCompact,
	regular: translation.Home.ClockSizeRegular,
	large: translation.Home.ClockSizeLarge,
};

type CustomizeTab = "look" | "clock" | "widgets" | "desktop";

const CUSTOMIZE_TABS: SegmentedTab<CustomizeTab>[] = [
	{ id: "look", label: translation.Home.CustomizeTabLook, icon: "sparks" },
	{ id: "clock", label: translation.Home.CustomizeClock, icon: "history" },
	{ id: "widgets", label: translation.Home.CustomizeWidgets, icon: "multi-window" },
	{ id: "desktop", label: translation.Home.CustomizeTabDesktop, icon: "home" },
];

/** Untitled when the tab already names what the section holds. */
function Section({ title, children }: Readonly<{ title?: string; children: React.ReactNode }>) {
	return (
		<section className="border-b border-border px-4 py-3.5 last:border-b-0">
			{title ? <OverlineText className="mb-2.5 block text-muted">{title}</OverlineText> : null}
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

function SavedLooks() {
	const { t } = useTranslation();
	const { personalization, update, saveLook, deleteLook } = useDesktopPersonalization();
	const { clockStyle, setClockStyle } = useClockStyle();
	const [name, setName] = useState("");
	const trimmed = name.trim();

	const save = () => {
		if (!trimmed) return;
		saveLook(trimmed, clockStyle);
		setName("");
	};

	return (
		<>
			{personalization.looks.length === 0 ? (
				<CaptionText as="p" tone="muted" className="mb-2.5">
					{t(translation.Home.LooksEmpty)}
				</CaptionText>
			) : (
				<div className="mb-2.5 flex flex-wrap gap-1.5">
					{personalization.looks.map((look) => (
						<span key={look.name} className="flex items-center gap-0.5">
							<Choice
								label={look.name}
								selected={false}
								onSelect={() => {
									update(look.settings);
									setClockStyle(look.clockStyle);
								}}
							/>
							<IconButton
								icon="xmark"
								title={t(translation.Home.LookDelete, { name: look.name })}
								aria-label={t(translation.Home.LookDelete, { name: look.name })}
								onClick={() => deleteLook(look.name)}
							/>
						</span>
					))}
				</div>
			)}

			<div className="flex items-center gap-2">
				<TextInput
					value={name}
					onChange={(event) => setName(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter") save();
					}}
					aria-label={t(translation.Home.LookNamePlaceholder)}
					placeholder={t(translation.Home.LookNamePlaceholder)}
					size="sm"
					className="min-w-0 flex-1"
				/>
				<LabelButton
					label={translation.Home.LookSave}
					variant="accent"
					disabled={!trimmed}
					onClick={save}
				/>
			</div>
		</>
	);
}

function ShortcutList({ shortcuts }: Readonly<{ shortcuts: DesktopShortcut[] }>) {
	const { t } = useTranslation();
	const { personalization, update } = useDesktopPersonalization();
	const arranged = arrangeShortcuts(shortcuts, personalization.shortcutOrder);

	const move = (from: number, to: number) => {
		const order = arranged.map((shortcut) => shortcut.id);
		[order[from], order[to]] = [order[to], order[from]];
		update({ shortcutOrder: order });
	};

	const setShown = (id: string, shown: boolean) =>
		update({
			hiddenShortcuts: shown
				? personalization.hiddenShortcuts.filter((hidden) => hidden !== id)
				: [...personalization.hiddenShortcuts, id],
		});

	return (
		<ul className="divide-y divide-border">
			{arranged.map((shortcut, index) => (
				<li key={shortcut.id} className="flex items-center gap-2 py-1.5">
					<span className="min-w-0 flex-1 truncate text-sm text-text">{shortcut.label}</span>

					<Switch
						tone="quiet"
						label={t(translation.Home.ShortcutShow, { name: shortcut.label })}
						checked={!personalization.hiddenShortcuts.includes(shortcut.id)}
						disabled={shortcut.id === CUSTOMIZE_SHORTCUT_ID}
						onChange={(shown) => setShown(shortcut.id, shown)}
					/>
					<IconButton
						icon="arrow-left"
						iconClassName="rotate-90"
						title={t(translation.Home.ShortcutMoveUp, { name: shortcut.label })}
						aria-label={t(translation.Home.ShortcutMoveUp, { name: shortcut.label })}
						disabled={index === 0}
						onClick={() => move(index, index - 1)}
					/>
					<IconButton
						icon="arrow-left"
						iconClassName="-rotate-90"
						title={t(translation.Home.ShortcutMoveDown, { name: shortcut.label })}
						aria-label={t(translation.Home.ShortcutMoveDown, { name: shortcut.label })}
						disabled={index === arranged.length - 1}
						onClick={() => move(index, index + 1)}
					/>
				</li>
			))}
		</ul>
	);
}

export function CustomizePanel({ shortcuts }: Readonly<{ shortcuts: DesktopShortcut[] }>) {
	const { t } = useTranslation();
	const { personalization, update, toggleWidget } = useDesktopPersonalization();
	const { clockStyle, setClockStyle } = useClockStyle();
	const [tab, setTab] = useState<CustomizeTab>("look");

	const renderTab = () => {
		switch (tab) {
			case "look":
				return (
					<>
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

						<Section title={t(translation.Home.CustomizeLooks)}>
							<SavedLooks />
						</Section>
					</>
				);

			case "clock":
				return (
					<>
						<Section title={t(translation.Home.ClockStyle)}>
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

						<Section title={t(translation.Home.ClockSize)}>
							<div className="flex flex-wrap gap-1.5">
								{CLOCK_SIZE_OPTIONS.map((clockSize) => (
									<Choice
										key={clockSize}
										label={t(CLOCK_SIZE_LABELS[clockSize])}
										selected={personalization.clockSize === clockSize}
										onSelect={() => update({ clockSize })}
									/>
								))}
							</div>
						</Section>

						<Section>
							<div className="flex items-center justify-between gap-3">
								<span className="text-sm text-text">{t(translation.Home.GreetingShow)}</span>
								<Switch
									label={t(translation.Home.GreetingShow)}
									checked={personalization.greeting}
									onChange={(greeting) => update({ greeting })}
								/>
							</div>

							{personalization.greeting ? (
								<TextInput
									value={personalization.name}
									onChange={(event) => update({ name: event.target.value })}
									aria-label={t(translation.Home.GreetingName)}
									placeholder={t(translation.Home.GreetingName)}
									size="sm"
									className="mt-2.5"
								/>
							) : null}
						</Section>

						<Section title={t(translation.Home.SecondZone)}>
							<SelectInput
								value={personalization.secondZone ?? ""}
								onChange={(event) => update({ secondZone: event.target.value || null })}
								aria-label={t(translation.Home.SecondZone)}
								icon="globe"
								size="sm"
							>
								<option value="">{t(translation.Home.SecondZoneNone)}</option>
								{SECOND_ZONE_OPTIONS.map((zone) => (
									<option key={zone} value={zone}>
										{zoneCity(zone)}
									</option>
								))}
							</SelectInput>
						</Section>
					</>
				);

			case "widgets":
				return (
					<Section>
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
				);

			case "desktop":
				return (
					<>
						<Section>
							<div className="flex items-center justify-between gap-3">
								<div className="min-w-0">
									<p className="text-sm text-text">{t(translation.Home.CustomizeFocus)}</p>
									<CaptionText as="p" tone="muted">
										{t(translation.Home.FocusHint)}
									</CaptionText>
								</div>
								<Switch
									label={t(translation.Home.CustomizeFocus)}
									checked={personalization.focus}
									onChange={(focus) => update({ focus })}
								/>
							</div>
						</Section>

						<Section title={t(translation.Home.CustomizeIcons)}>
							<div className="flex flex-wrap gap-1.5">
								{ICON_PLACEMENT_OPTIONS.map((placement) => (
									<Choice
										key={placement}
										label={t(ICON_PLACEMENT_LABELS[placement])}
										selected={personalization.icons === placement}
										onSelect={() => update({ icons: placement })}
									/>
								))}
							</div>
						</Section>

						<Section title={t(translation.Home.CustomizeShortcuts)}>
							<ShortcutList shortcuts={shortcuts} />
						</Section>
					</>
				);
		}
	};

	return (
		<div className="flex flex-col">
			<div className="overflow-x-auto border-b border-border px-4 py-3">
				<SegmentedTabs tabs={CUSTOMIZE_TABS} active={tab} onSelect={setTab} />
			</div>

			{renderTab()}
		</div>
	);
}
