import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@/i18n/translation";
import type { ImportedTemplateOption } from "@/shared/types/lazify";

import { savedTemplateIconOf } from "../lib/stack-icons";
import { SourceOptionRow } from "./SourceOptionRow";

interface ImportedTemplatePickerProps {
	templates: ImportedTemplateOption[];
	onSelect: (templateId: string) => void;
	onOpenTemplates: () => void;
}

export function ImportedTemplatePicker({
	templates,
	onSelect,
	onOpenTemplates,
}: Readonly<ImportedTemplatePickerProps>) {
	const { t } = useTranslation();

	if (templates.length === 0) {
		return (
			<div
				className={clsx(
					"flex flex-col items-start gap-3",
					"rounded-2xl",
					"border border-dashed border-border",
					"px-5 py-6",
				)}
			>
				<p className="max-w-prose text-sm text-muted">{t(translation.InitProject.NoTemplatesSaved)}</p>
				<button
					type="button"
					onClick={onOpenTemplates}
					className={clsx(
						"inline-flex h-9 items-center rounded-lg",
						"bg-bg",
						"border border-border",
						"text-sm font-medium text-text",
						"px-3.5",
						"transition-colors hover:border-accent hover:text-accent",
						"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
					)}
				>
					{t(translation.InitProject.OpenTemplates)}
				</button>
			</div>
		);
	}

	return (
		<ul className={clsx("overflow-hidden rounded-2xl", "bg-soft", "border border-border", "divide-y divide-border")}>
			{templates.map((template) => (
				<SourceOptionRow
					key={template.id}
					icon={savedTemplateIconOf(template.stack)}
					title={template.name}
					description={template.description || template.sourceProjectPath}
					onSelect={() => onSelect(template.id)}
				/>
			))}
		</ul>
	);
}
