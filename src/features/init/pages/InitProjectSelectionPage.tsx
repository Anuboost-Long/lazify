import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { PageCrumb } from "@/app/components/PageChrome";
import { translation } from "@/i18n/translation";
import type { ImportedTemplateOption, TemplateOption } from "@/shared/types/lazify";
import { BodyText, SectionTitle } from "@/shared/typography";

import { ImportedTemplatePicker } from "../components/ImportedTemplatePicker";
import { SourceOptionRow } from "../components/SourceOptionRow";
import { stackIconOf } from "../lib/stack-icons";

type SourceMode = "stack" | "imported";

interface InitProjectSelectionPageProps {
	importedTemplateOptions: ImportedTemplateOption[];
	sourceMode: SourceMode;
	templateOptions: TemplateOption[];
	onSelectSourceMode: (value: SourceMode) => void;
	onSelectTemplate: (templateId: string) => void;
	onSelectImportedTemplate: (templateId: string) => void;
	onOpenTemplates: () => void;
}

/** Two native radios, so arrow keys move between them and the pair is announced as one choice. */
function SourceModeSwitch({
	value,
	options,
	onChange,
}: Readonly<{
	value: SourceMode;
	options: { value: SourceMode; label: string }[];
	onChange: (value: SourceMode) => void;
}>) {
	const { t } = useTranslation();

	return (
		<fieldset className={clsx("inline-flex shrink-0 rounded-lg", "bg-soft", "border border-border", "p-0.5")}>
			<legend className="sr-only">{t(translation.InitProject.ChooseSource)}</legend>
			{options.map((option) => (
				<label
					key={option.value}
					className={clsx(
						"relative inline-flex h-8 cursor-pointer items-center rounded-md",
						"text-sm font-medium text-muted",
						"px-3",
						"transition-colors duration-150 hover:text-text",
						"has-checked:bg-text/10 has-checked:text-text",
						"has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-accent",
					)}
				>
					<input
						type="radio"
						name="init-source-mode"
						value={option.value}
						checked={value === option.value}
						onChange={() => onChange(option.value)}
						className="sr-only"
					/>
					{option.label}
				</label>
			))}
		</fieldset>
	);
}

export function InitProjectSelectionPage({
	importedTemplateOptions,
	sourceMode,
	templateOptions,
	onSelectSourceMode,
	onSelectTemplate,
	onSelectImportedTemplate,
	onOpenTemplates,
}: Readonly<InitProjectSelectionPageProps>) {
	const { t } = useTranslation();

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
			<PageCrumb>
				<span className="text-xs text-muted/50">/</span>
				<span className="text-xs font-medium text-text">{t(translation.InitProject.ChooseSource)}</span>
			</PageCrumb>

			<div className="flex flex-wrap items-end justify-between gap-4">
				<div className="min-w-0">
					<SectionTitle>{t(translation.InitProject.ChooseSource)}</SectionTitle>
					<BodyText tone="muted" className="mt-1">
						{sourceMode === "imported"
							? t(translation.InitProject.DescriptionImported)
							: t(translation.InitProject.DescriptionStack)}
					</BodyText>
				</div>

				<SourceModeSwitch
					value={sourceMode}
					options={[
						{ value: "stack", label: t(translation.WorkflowForm.Stack) },
						{ value: "imported", label: t(translation.WorkflowForm.ImportedTemplateLabel) },
					]}
					onChange={onSelectSourceMode}
				/>
			</div>

			{sourceMode === "stack" ? (
				<ul
					className={clsx("overflow-hidden rounded-2xl", "bg-soft", "border border-border", "divide-y divide-border")}
				>
					{templateOptions.map((template) => (
						<SourceOptionRow
							key={template.id}
							icon={stackIconOf(template.id)}
							title={template.label}
							description={template.description}
							onSelect={() => onSelectTemplate(template.id)}
						/>
					))}
				</ul>
			) : (
				<ImportedTemplatePicker
					templates={importedTemplateOptions}
					onSelect={onSelectImportedTemplate}
					onOpenTemplates={onOpenTemplates}
				/>
			)}
		</div>
	);
}
