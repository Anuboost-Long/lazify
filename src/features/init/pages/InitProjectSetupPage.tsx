import { useTranslation } from "react-i18next";

import { PageCrumb } from "@/app/components/PageChrome";
import { WorkflowForm } from "@/features/init/components/WorkflowForm";
import { translation } from "@/i18n/translation";
import type { TemplateOption } from "@/shared/types/lazify";

interface InitProjectSetupPageProps {
	busy: boolean;
	sourceMode: "stack" | "imported";
	sourceLabel: string;
	sourceIcon: string;
	projectName: string;
	projectDirectory: string;
	packageName: string;
	selectedTemplateId: string;
	templateOptions: TemplateOption[];
	createOptionValues: Record<string, boolean>;
	onChangeSelection: () => void;
	onProjectNameChange: (value: string) => void;
	onPackageNameChange: (value: string) => void;
	onBrowseDirectory: () => void;
	onContinue: () => void;
	onCreateOptionChange: (key: string, value: boolean) => void;
}

export function InitProjectSetupPage({ onChangeSelection, ...props }: Readonly<InitProjectSetupPageProps>) {
	const { t } = useTranslation();

	return (
		<>
			<PageCrumb>
				<span className="text-xs text-muted/50">/</span>
				<span className="text-xs font-medium text-text">{t(translation.WorkflowForm.Title)}</span>
			</PageCrumb>

			<WorkflowForm {...props} onBack={onChangeSelection} backLabel={t(translation.InitProject.ChangeSelection)} />
		</>
	);
}
