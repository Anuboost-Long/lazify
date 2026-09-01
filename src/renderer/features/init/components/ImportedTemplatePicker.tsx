import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { ImportedTemplateOption } from "@renderer/shared/types/lazify";
import { BodyText } from "@renderer/shared/typography";
import { ImportedTemplateCard } from "@renderer/shared/ui/ImportedTemplateCard";

interface ImportedTemplatePickerProps {
	templates: ImportedTemplateOption[];
	selectedTemplateId: string;
	onSelect: (templateId: string) => void;
}

export function ImportedTemplatePicker({
	templates,
	selectedTemplateId,
	onSelect,
}: Readonly<ImportedTemplatePickerProps>) {
	const { t } = useTranslation();

	if (templates.length === 0) {
		return (
			<section className="rounded-[24px] border border-border bg-soft p-6 shadow-panel">
				<BodyText tone="muted" className="leading-6">
					{t(translation.InitProject.NoTemplatesSaved)}
				</BodyText>
			</section>
		);
	}

	return (
		<section className="grid gap-4 lg:grid-cols-2">
			{templates.map((template) => (
				<ImportedTemplateCard
					key={template.id}
					template={template}
					active={template.id === selectedTemplateId}
					onSelect={onSelect}
				/>
			))}
		</section>
	);
}
