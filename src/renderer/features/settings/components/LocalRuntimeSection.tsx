import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { EnvironmentSummary } from "@renderer/shared/types/lazify";

import { RuntimeCard } from "./RuntimeCard";
import { SectionLabel } from "./SectionLabel";

interface LocalRuntimeSectionProps {
	environment: EnvironmentSummary | null;
}

export function LocalRuntimeSection({ environment }: Readonly<LocalRuntimeSectionProps>) {
	const { t } = useTranslation();
	const unavailable = t(translation.GlobalTerm.Unavailable);
	const runtimeItems = [
		{
			label: translation.Settings.NodeRuntime,
			value: environment?.nodeVersion ?? unavailable,
			icon: "activity" as const,
		},
		{
			label: "npm",
			value: environment?.npmVersion ?? unavailable,
			icon: "package" as const,
		},
		{
			label: "yarn",
			value: environment?.yarnVersion ?? unavailable,
			icon: "refresh-circle" as const,
		},
	];

	return (
		<div className="border-t border-border pt-6">
			<SectionLabel>{t(translation.Settings.LocalRuntime)}</SectionLabel>
			<div className="grid gap-3 sm:grid-cols-3">
				{runtimeItems.map((item) => (
					<RuntimeCard key={item.label} label={item.label} value={item.value} icon={item.icon} />
				))}
			</div>
		</div>
	);
}
