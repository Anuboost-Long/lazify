import { ipcMain } from "electron";
import type { ProjectTreeNode } from "../../renderer/shared/types/lazify";
import { getTemplate, listTemplates } from "../scaffolding/harmonizer";
import { deleteImportedTemplate, getImportedTemplate, listImportedTemplates, saveImportedTemplateFromProject, updateImportedTemplate } from "../scaffolding/imported-template-store";
import { searchNpmPackages } from "../scaffolding/npm-registry";
import { listTemplatePackageEntries } from "../scaffolding/template-package-manifest";

export function registerTemplateHandlers() {
  ipcMain.handle("lazify:templates", async () => listTemplates());
  ipcMain.handle("lazify:imported-templates", async () => listImportedTemplates());
  ipcMain.handle("lazify:imported-template", async (_event, templateId: string) =>
    getImportedTemplate(templateId)
  );
  ipcMain.handle(
    "lazify:update-imported-template",
    async (
      _event,
      templateId: string,
      updates: { name?: string | null; tree?: ProjectTreeNode[] | null }
    ) => updateImportedTemplate(templateId, updates)
  );
  ipcMain.handle("lazify:delete-imported-template", async (_event, templateId: string) =>
    deleteImportedTemplate(templateId)
  );

  ipcMain.handle("lazify:template-package-manifest", async (_event, templateId: string) =>
    listTemplatePackageEntries(getTemplate(templateId))
  );

  ipcMain.handle("lazify:search-npm-packages", async (_event, query: string) =>
    searchNpmPackages(query)
  );

  ipcMain.handle(
    "lazify:save-imported-template",
    async (
      _event,
      projectPath: string,
      includedRelativePaths: string[],
      providedName?: string | null,
      confirmedStack?: string | null
    ) =>
      saveImportedTemplateFromProject(
        projectPath,
        includedRelativePaths,
        providedName,
        confirmedStack
      )
  );
}
