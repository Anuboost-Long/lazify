import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { CaptionText } from "@renderer/shared/typography";
import { TextInput } from "@renderer/shared/ui/form/FormInput";

import type { ProjectSearchOptions } from "./useProjectSearch";

interface ProjectSearchFiltersProps {
	options: ProjectSearchOptions;
	onOptionChange: <TKey extends keyof ProjectSearchOptions>(
		key: TKey,
		value: ProjectSearchOptions[TKey],
	) => void;
}

export function ProjectSearchFilters({
	options,
	onOptionChange,
}: Readonly<ProjectSearchFiltersProps>) {
	const { t } = useTranslation();

	const globField = (key: "include" | "exclude", label: string, placeholder: string) => (
		<label className="block">
			<CaptionText as="span" tone="muted">
				{label}
			</CaptionText>
			<TextInput
				size="sm"
				value={options[key]}
				spellCheck={false}
				placeholder={placeholder}
				onChange={(event) => onOptionChange(key, event.target.value)}
				className="mt-1"
				inputClassName="font-mono text-xs"
			/>
		</label>
	);

	return (
		<div className="mt-2.5 space-y-2 pl-7">
			{globField(
				"include",
				t(translation.ProjectSearch.FilesToInclude),
				t(translation.ProjectSearch.IncludePlaceholder),
			)}
			{globField(
				"exclude",
				t(translation.ProjectSearch.FilesToExclude),
				t(translation.ProjectSearch.ExcludePlaceholder),
			)}

			<label className="flex items-center gap-2">
				<input
					type="checkbox"
					checked={options.useIgnoreFiles}
					onChange={(event) => onOptionChange("useIgnoreFiles", event.target.checked)}
					className="h-3.5 w-3.5 shrink-0 accent-accent"
				/>
				<CaptionText as="span" tone="muted">
					{t(translation.ProjectSearch.UseIgnoreFiles)}
				</CaptionText>
			</label>
		</div>
	);
}
