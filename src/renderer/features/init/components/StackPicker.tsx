import type { TemplateOption } from "@renderer/shared/types/lazify";

import { StackPickerCard } from "./StackPickerCard";

interface StackPickerProps {
	selectedTemplateId: string;
	templateOptions: TemplateOption[];
	onSelect: (templateId: string) => void;
}

export function StackPicker({
	selectedTemplateId,
	templateOptions,
	onSelect,
}: Readonly<StackPickerProps>) {
	return (
		<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			{templateOptions.map((template, index) => (
				<StackPickerCard
					key={template.id}
					template={template}
					active={template.id === selectedTemplateId}
					animationDelay={index * 90}
					onSelect={onSelect}
				/>
			))}
		</section>
	);
}
