import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";

import { appRoute } from "@/app/app-routes";
import { savedTemplateIconOf, stackIconOf } from "@/features/init/lib/stack-icons";
import { InitProjectSetupPage } from "@/features/init/pages/InitProjectSetupPage";
import { translation } from "@/i18n/translation";
import { useLazifyStore } from "@/shared/hooks/use-lazify-store";

export function InitProjectSetupRoute() {
	const navigate = useNavigate();
	const { t } = useTranslation();
	const {
		busy,
		initSourceMode,
		packageName,
		projectDirectory,
		projectName,
		selectedImportedTemplate,
		selectedImportedTemplateId,
		selectedTemplateId,
		templateOptions,
		loadImportedTemplate,
		setPackageName,
		setProjectName,
		setSelectedTemplateId,
		pickProjectDirectory,
		createProject,
		createOptionValues,
		setCreateOptionValues,
	} = useLazifyStore();
	const hasSelection = initSourceMode === "stack" ? Boolean(selectedTemplateId) : Boolean(selectedImportedTemplateId);

	if (!hasSelection) {
		return <Navigate to={appRoute.initProject} replace />;
	}

	const sourceLabel =
		initSourceMode === "stack"
			? (templateOptions.find((template) => template.id === selectedTemplateId)?.label ??
				t(translation.InitProject.SelectedStack))
			: (selectedImportedTemplate?.name ?? t(translation.Templates.ImportedTemplate));
	const sourceIcon =
		initSourceMode === "stack"
			? stackIconOf(selectedTemplateId)
			: savedTemplateIconOf(selectedImportedTemplate?.stackDetection.stack ?? "react-unknown");

	return (
		<InitProjectSetupPage
			busy={busy}
			sourceMode={initSourceMode}
			sourceLabel={sourceLabel}
			sourceIcon={sourceIcon}
			projectName={projectName}
			projectDirectory={projectDirectory}
			packageName={packageName}
			selectedTemplateId={selectedTemplateId}
			templateOptions={templateOptions}
			createOptionValues={createOptionValues}
			onChangeSelection={() => {
				if (initSourceMode === "stack") {
					setSelectedTemplateId("");
				} else {
					void loadImportedTemplate("");
				}
				navigate(appRoute.initProject);
			}}
			onProjectNameChange={setProjectName}
			onPackageNameChange={setPackageName}
			onBrowseDirectory={() => void pickProjectDirectory()}
			onContinue={() => {
				void createProject();
				navigate(appRoute.initProjectProgress);
			}}
			onCreateOptionChange={(key, value) => setCreateOptionValues((current) => ({ ...current, [key]: value }))}
		/>
	);
}
