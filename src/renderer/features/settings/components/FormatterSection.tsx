import clsx from "clsx";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { FormatterDefaults } from "@main/formatting";
import { translation } from "@renderer/i18n/translation";
import { useFormatterSettings } from "@renderer/shared/hooks/use-formatter";
import { MonoText, SmallText } from "@renderer/shared/typography";
import { useHighlightedLines } from "@renderer/shared/ui/code/CodeText";

import { SectionLabel } from "./SectionLabel";
import { SelectChip } from "./SelectChip";
import { SettingRow } from "./SettingRow";
import { ToggleSwitch } from "./ToggleSwitch";

/** A width or an indent, stepped rather than typed — both have a sane range. */
function StepNumber({
	label,
	value,
	min,
	max,
	step,
	onChange,
}: Readonly<{
	label: string;
	value: number;
	min: number;
	max: number;
	step: number;
	onChange: (next: number) => void;
}>) {
	const { t } = useTranslation();
	const set = (next: number) => onChange(Math.min(max, Math.max(min, next)));

	return (
		<div
			className={clsx("flex items-center gap-1 rounded-lg border border-border bg-bg", "h-9 px-1")}
		>
			<button
				type="button"
				aria-label={`${t(translation.GlobalTerm.Decrease)} ${label}`}
				onClick={() => set(value - step)}
				disabled={value <= min}
				className={clsx(
					"flex h-7 w-7 items-center justify-center rounded-md",
					"text-muted transition-colors",
					"hover:bg-text/10 hover:text-text disabled:opacity-40 disabled:hover:bg-transparent",
				)}
			>
				<span aria-hidden>−</span>
			</button>
			<MonoText as="span" className="!text-text w-8 text-center text-[13px]">
				{value}
			</MonoText>
			<button
				type="button"
				aria-label={`${t(translation.GlobalTerm.Increase)} ${label}`}
				onClick={() => set(value + step)}
				disabled={value >= max}
				className={clsx(
					"flex h-7 w-7 items-center justify-center rounded-md",
					"text-muted transition-colors",
					"hover:bg-text/10 hover:text-text disabled:opacity-40 disabled:hover:bg-transparent",
				)}
			>
				<span aria-hidden>+</span>
			</button>
		</div>
	);
}

/** The fallback rules, applied to a snippet, so a change is visible not described. */
function SamplePreview({ defaults }: Readonly<{ defaults: FormatterDefaults }>) {
	const { t } = useTranslation();
	const [code, setCode] = useState("");

	useEffect(() => {
		let cancelled = false;

		void globalThis.lazify
			.formatSample(defaults)
			.then((next) => {
				if (!cancelled) setCode(next);
			})
			.catch(() => undefined);

		return () => {
			cancelled = true;
		};
	}, [defaults]);

	const lines = useHighlightedLines(code.replace(/\n$/, ""), "typescript");

	return (
		<div className="overflow-hidden rounded-2xl border border-border bg-terminal">
			<div className="flex items-center justify-between border-b border-border px-4 py-2">
				<SmallText as="span" className="!text-muted">
					{t(translation.Settings.FormatPreview)}
				</SmallText>
				<MonoText as="span" className="!text-muted text-[11px]">
					{`${defaults.printWidth}c · ${defaults.useTabs ? "tab" : `${defaults.tabWidth}sp`}`}
				</MonoText>
			</div>

			<pre className="overflow-x-auto px-4 py-3">
				<code className="block font-mono text-[12.5px] leading-[1.6]">
					{lines.map((line, index) => (
						<span key={index} className="block whitespace-pre">
							{line}
						</span>
					))}
				</code>
			</pre>
		</div>
	);
}

export function FormatterSection() {
	const { t } = useTranslation();
	const { mode, organizeImports, defaults, setMode, setOrganizeImports, setDefaults } =
		useFormatterSettings();

	if (!defaults) return null;

	const automatic = mode === "auto";

	return (
		<div className="flex flex-col gap-8">
			<div>
				<SectionLabel>{t(translation.Settings.FormatWhen)}</SectionLabel>
				<div className={clsx("rounded-2xl border border-border bg-soft", "divide-y divide-border")}>
					<div className="px-5">
						<SettingRow
							label={t(translation.Settings.FormatAuto)}
							description={t(
								automatic ? translation.Settings.FormatAutoDesc : translation.Settings.FormatManualDesc,
							)}
						>
							<ToggleSwitch enabled={automatic} onChange={(next) => setMode(next ? "auto" : "manual")} />
						</SettingRow>
					</div>

					<div className="px-5">
						<SettingRow
							label={t(translation.Settings.FormatOrganizeImports)}
							description={t(translation.Settings.FormatOrganizeImportsDesc)}
						>
							<ToggleSwitch enabled={organizeImports} onChange={setOrganizeImports} />
						</SettingRow>
					</div>
				</div>
			</div>

			<div>
				<SectionLabel>{t(translation.Settings.FormatDefaults)}</SectionLabel>
				<SmallText className="!text-muted -mt-2 mb-4 block">
					{t(translation.Settings.FormatDefaultsDesc)}
				</SmallText>

				<div className={clsx("rounded-2xl border border-border bg-soft", "divide-y divide-border")}>
					<div className="px-5">
						<SettingRow label={t(translation.Settings.FormatPrintWidth)}>
							<StepNumber
								label={t(translation.Settings.FormatPrintWidth)}
								value={defaults.printWidth}
								min={40}
								max={200}
								step={10}
								onChange={(printWidth) => setDefaults({ printWidth })}
							/>
						</SettingRow>
					</div>

					<div className="px-5">
						<SettingRow label={t(translation.Settings.FormatTabWidth)}>
							<StepNumber
								label={t(translation.Settings.FormatTabWidth)}
								value={defaults.tabWidth}
								min={1}
								max={8}
								step={1}
								onChange={(tabWidth) => setDefaults({ tabWidth })}
							/>
						</SettingRow>
					</div>

					<div className="px-5">
						<SettingRow label={t(translation.Settings.FormatUseTabs)}>
							<ToggleSwitch enabled={defaults.useTabs} onChange={(useTabs) => setDefaults({ useTabs })} />
						</SettingRow>
					</div>

					<div className="px-5">
						<SettingRow label={t(translation.Settings.FormatSemi)}>
							<ToggleSwitch enabled={defaults.semi} onChange={(semi) => setDefaults({ semi })} />
						</SettingRow>
					</div>

					<div className="px-5">
						<SettingRow label={t(translation.Settings.FormatSingleQuote)}>
							<ToggleSwitch
								enabled={defaults.singleQuote}
								onChange={(singleQuote) => setDefaults({ singleQuote })}
							/>
						</SettingRow>
					</div>

					<div className="px-5">
						<SettingRow label={t(translation.Settings.FormatBracketSpacing)}>
							<ToggleSwitch
								enabled={defaults.bracketSpacing}
								onChange={(bracketSpacing) => setDefaults({ bracketSpacing })}
							/>
						</SettingRow>
					</div>

					<div className="px-5">
						<SettingRow label={t(translation.Settings.FormatTrailingComma)}>
							<SelectChip
								value={defaults.trailingComma}
								onChange={(id) => setDefaults({ trailingComma: id as FormatterDefaults["trailingComma"] })}
								options={[
									{ id: "none", label: t(translation.Settings.FormatTrailingNone) },
									{ id: "es5", label: t(translation.Settings.FormatTrailingEs5) },
									{ id: "all", label: t(translation.Settings.FormatTrailingAll) },
								]}
							/>
						</SettingRow>
					</div>
				</div>
			</div>

			<SamplePreview defaults={defaults} />
		</div>
	);
}
