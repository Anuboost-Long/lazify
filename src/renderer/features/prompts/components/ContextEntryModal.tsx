import clsx from "clsx";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
	contextType,
	renderContext,
	type ContextField,
	type ContextPayload,
	type ContextTypeId,
} from "@main/prompts/context-types";
import type {
	ContextEntry,
	ContextEntryInput,
	ContextScope,
	PromptPreset,
} from "@main/prompts/types";
import { translation } from "@renderer/i18n/translation";
import { CaptionText, OverlineText, SectionTitle, SmallText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";

import { CONTEXT_CATEGORIES } from "../lib/context-categories";
import { ContextTypePicker } from "./ContextTypePicker";
import { fieldBase, fieldTextarea } from "./form-fields";

interface ContextEntryModalProps {
	open: boolean;
	scope: ContextScope;
	scopeKey: string;
	existing: ContextEntry | null;
	presets: PromptPreset[];
	onSave: (input: ContextEntryInput) => void;
	onClose: () => void;
}

interface FieldControlProps {
	field: ContextField;
	/** Undefined until the user has typed into it, which a select leans on. */
	value: string | undefined;
	onChange: (value: string) => void;
}

/** The one input a field asks for: a picker, a paragraph, or a single line. */
function FieldControl({ field, value, onChange }: Readonly<FieldControlProps>) {
	const { t } = useTranslation();

	if (field.kind === "select") {
		return (
			<select
				value={value ?? field.options?.[0] ?? ""}
				onChange={(event) => onChange(event.target.value)}
				className={fieldBase}
			>
				{(field.options ?? []).map((option) => (
					<option key={option} value={option}>
						{option}
					</option>
				))}
			</select>
		);
	}

	if (field.kind === "textarea") {
		return (
			<textarea
				autoFocus
				value={value ?? ""}
				onChange={(event) => onChange(event.target.value)}
				placeholder={t(field.placeholder)}
				className={fieldTextarea}
			/>
		);
	}

	return (
		<input
			value={value ?? ""}
			onChange={(event) => onChange(event.target.value)}
			placeholder={t(field.placeholder)}
			className={fieldBase}
		/>
	);
}

export function ContextEntryModal(props: Readonly<ContextEntryModalProps>) {
	return (
		<BaseModal open={props.open} onClose={props.onClose}>
			{props.open ? <ContextEntryCard {...props} /> : null}
		</BaseModal>
	);
}

function ContextEntryCard({
	scope,
	scopeKey,
	existing,
	presets,
	onSave,
	onClose,
}: Readonly<ContextEntryModalProps>) {
	const { t } = useTranslation();

	const [type, setType] = useState<ContextTypeId>(existing?.type ?? "rule");
	const [payload, setPayload] = useState<ContextPayload>(existing?.payload ?? {});
	const [category, setCategory] = useState(existing?.category ?? "Coding Rules");
	const [appliesTo, setAppliesTo] = useState<string[]>(existing?.appliesTo ?? []);

	const definition = contextType(type);
	const preview = useMemo(() => renderContext(type, payload), [type, payload]);
	const complete = definition.fields
		.filter((field) => field.required)
		.every((field) => (payload[field.name] ?? "").trim());

	const set = (name: string, value: string) =>
		setPayload((current) => ({ ...current, [name]: value }));

	return (
		<div
			className={clsx(
				"flex max-h-[88vh] w-[min(720px,92vw)] flex-col overflow-hidden",
				"rounded-2xl border border-border bg-bg shadow-2xl",
			)}
		>
			<header className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
				<div>
					<SectionTitle>
						{t(existing ? translation.PromptBuilder.EditEntry : translation.PromptBuilder.AddEntry)}
					</SectionTitle>
					<CaptionText tone="muted">{t(translation.PromptBuilder.EntryHint)}</CaptionText>
				</div>

				<button
					type="button"
					onClick={onClose}
					aria-label={t(translation.GlobalTerm.Close)}
					className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-text/[0.06]"
				>
					<UiIcon name="xmark" className="h-4 w-4" />
				</button>
			</header>

			<div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
				<section className="flex flex-col gap-2">
					<OverlineText tone="muted">{t(translation.PromptBuilder.ContextType)}</OverlineText>
					<ContextTypePicker
						selected={type}
						onSelect={(next) => {
							setType(next);
							setPayload({});
						}}
					/>
				</section>

				<section className="grid grid-cols-2 gap-4">
					{definition.fields.map((field) => (
						<div
							key={field.name}
							className={clsx("flex flex-col gap-1.5", field.kind === "textarea" && "col-span-2")}
						>
							<OverlineText tone="muted">{t(field.label)}</OverlineText>

							<FieldControl
								field={field}
								value={payload[field.name]}
								onChange={(next) => set(field.name, next)}
							/>
						</div>
					))}
				</section>

				<section className="flex flex-col gap-1.5">
					<OverlineText tone="muted">{t(translation.PromptBuilder.EntryPreview)}</OverlineText>
					<div className="rounded-xl border border-accent/25 bg-accent/[0.06] px-4 py-3">
						<SmallText className="!text-text block font-mono leading-6">
							{preview ? `- ${preview}` : t(translation.PromptBuilder.PreviewPending)}
						</SmallText>
					</div>
				</section>

				<section className="grid grid-cols-2 gap-4">
					<div className="flex flex-col gap-1.5">
						<OverlineText tone="muted">{t(translation.PromptBuilder.Category)}</OverlineText>
						<select
							value={category}
							onChange={(event) => setCategory(event.target.value)}
							className={fieldBase}
						>
							{CONTEXT_CATEGORIES.map((option) => (
								<option key={option} value={option}>
									{option}
								</option>
							))}
						</select>
					</div>

					<div className="flex flex-col gap-1.5">
						<OverlineText tone="muted">{t(translation.PromptBuilder.AppliesTo)}</OverlineText>
						<CaptionText tone="muted">{t(translation.PromptBuilder.AppliesToHint)}</CaptionText>

						<div className="flex flex-wrap gap-1.5 pt-1">
							{presets.map((preset) => {
								const on = appliesTo.includes(preset.id);

								return (
									<button
										key={preset.id}
										type="button"
										onClick={() =>
											setAppliesTo((current) =>
												on ? current.filter((id) => id !== preset.id) : [...current, preset.id],
											)
										}
										className={clsx(
											"rounded-full border px-3 py-1",
											on ? "border-accent bg-accent/10" : "border-border hover:border-accent/40",
										)}
									>
										<CaptionText className={on ? "!text-accent" : "!text-muted"}>{preset.name}</CaptionText>
									</button>
								);
							})}
						</div>
					</div>
				</section>
			</div>

			<footer className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
				<button
					type="button"
					onClick={onClose}
					className="rounded-full px-4 py-2 text-[12px] text-muted hover:text-text"
				>
					{t(translation.GlobalTerm.Cancel)}
				</button>
				<button
					type="button"
					disabled={!complete}
					onClick={() =>
						onSave({
							scope,
							scopeKey,
							type,
							category,
							payload,
							appliesTo,
							pack: existing?.pack ?? "",
							isActive: existing?.isActive ?? true,
							sortOrder: existing?.sortOrder ?? 0,
						})
					}
					className={clsx(
						"rounded-full border border-accent/40 bg-accent/10 px-5 py-2 text-[12px] text-accent",
						"hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-40",
					)}
				>
					{t(translation.GlobalTerm.Save)}
				</button>
			</footer>
		</div>
	);
}
