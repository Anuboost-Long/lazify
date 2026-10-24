import { useNavigate } from "react-router-dom";

import { appRoute } from "@/app/app-routes";
import { InitProjectSelectionPage } from "@/features/init/pages/InitProjectSelectionPage";
import { useLazifyStore } from "@/shared/hooks/use-lazify-store";

export function InitProjectSelectionRoute() {
	const navigate = useNavigate();
	const {
		importedTemplateOptions,
		initSourceMode,
		templateOptions,
		loadImportedTemplate,
		setInitSourceMode,
		setSelectedTemplateId,
	} = useLazifyStore();

	const handleSourceMode = (value: "stack" | "imported") => {
		setInitSourceMode(value);
		if (value === "stack") {
			void loadImportedTemplate("");
		} else {
			setSelectedTemplateId("");
		}
	};

	return (
		<InitProjectSelectionPage
			importedTemplateOptions={importedTemplateOptions}
			sourceMode={initSourceMode}
			templateOptions={templateOptions}
			onSelectSourceMode={handleSourceMode}
			onSelectTemplate={(templateId) => {
				setSelectedTemplateId(templateId);
				if (templateId) navigate(appRoute.initProjectSetup);
			}}
			onSelectImportedTemplate={(templateId) => {
				void loadImportedTemplate(templateId).then(() => {
					if (templateId) navigate(appRoute.initProjectSetup);
				});
			}}
			onOpenTemplates={() => navigate(appRoute.templates)}
		/>
	);
}
