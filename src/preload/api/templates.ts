import { ipcRenderer } from "electron";

import type { TemplateDefinition } from "../../main/scaffolding/harmonizer";
import type { TemplatePackageEntry } from "../../main/scaffolding/template-package-manifest";
import type {
	ImportedTemplateOption,
	ImportedTemplateSnapshot,
	ProjectTreeNode,
} from "../../renderer/shared/types/lazify";
export const templatesApi = {
	listTemplates: (): Promise<TemplateDefinition[]> => ipcRenderer.invoke("lazify:templates"),
	listImportedTemplates: (): Promise<ImportedTemplateOption[]> =>
		ipcRenderer.invoke("lazify:imported-templates"),
	getImportedTemplate: (templateId: string): Promise<ImportedTemplateSnapshot> =>
		ipcRenderer.invoke("lazify:imported-template", templateId),
	updateImportedTemplate: (
		templateId: string,
		updates: { name?: string | null; tree?: ProjectTreeNode[] | null },
	): Promise<ImportedTemplateSnapshot> =>
		ipcRenderer.invoke("lazify:update-imported-template", templateId, updates),
	deleteImportedTemplate: (templateId: string): Promise<void> =>
		ipcRenderer.invoke("lazify:delete-imported-template", templateId),
	getTemplatePackageManifest: (templateId: string): Promise<TemplatePackageEntry[]> =>
		ipcRenderer.invoke("lazify:template-package-manifest", templateId),
	saveImportedTemplate: (
		projectPath: string,
		includedRelativePaths: string[],
		providedName?: string | null,
		confirmedStack?: string | null,
	): Promise<ImportedTemplateSnapshot> =>
		ipcRenderer.invoke(
			"lazify:save-imported-template",
			projectPath,
			includedRelativePaths,
			providedName,
			confirmedStack,
		),
};
