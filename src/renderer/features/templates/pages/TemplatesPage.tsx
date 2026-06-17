import { useEffect, useState } from "react";
import { translation } from "@renderer/i18n/translation";
import { BodyText, OverlineText } from "@renderer/shared/typography";
import { PageHeader } from "@renderer/shared/ui/PageHeader";
import { ProjectTreeEditorPanel } from "@renderer/shared/ui/project-tree/ProjectTreeEditorPanel";
import type { TreeNode } from "@renderer/shared/ui/project-tree/types";
import type {
  ImportedTemplateOption,
  ImportedTemplateSnapshot,
} from "@renderer/shared/types/lazify";
import { TextInput } from "@renderer/shared/ui/form/FormInput";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { ImportedTemplateCard } from "@renderer/shared/ui/ImportedTemplateCard";
import { useTranslation } from "react-i18next";

interface TemplatesPageProps {
  importedTemplateOptions: ImportedTemplateOption[];
  selectedImportedTemplate: ImportedTemplateSnapshot | null;
  selectedImportedTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
  onSaveTemplate: (
    templateId: string,
    updates: { name?: string | null; tree?: TreeNode[] | null }
  ) => Promise<ImportedTemplateSnapshot>;
  onDeleteTemplate: (templateId: string) => Promise<void>;
}

export function TemplatesPage({
  importedTemplateOptions,
  selectedImportedTemplate,
  selectedImportedTemplateId,
  onSelectTemplate,
  onSaveTemplate,
  onDeleteTemplate,
}: TemplatesPageProps) {
  const { t } = useTranslation();
  const [draftName, setDraftName] = useState("");
  const [draftTree, setDraftTree] = useState<TreeNode[]>([]);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraftName(selectedImportedTemplate?.name ?? "");
    setDraftTree(selectedImportedTemplate?.tree ?? []);
    setErrorMessage(null);
  }, [selectedImportedTemplate]);

  const handleSave = async () => {
    if (!selectedImportedTemplate) {
      return;
    }

    try {
      setBusy(true);
      setErrorMessage(null);
      const savedTemplate = await onSaveTemplate(selectedImportedTemplate.id, {
        name: draftName,
        tree: draftTree,
      });
      setDraftName(savedTemplate.name);
      setDraftTree(savedTemplate.tree);
      setStatusMessage(t(translation.Templates.SavedSuccess, { name: savedTemplate.name }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t(translation.Templates.UpdateError));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedImportedTemplate) {
      return;
    }

    const confirmed = globalThis.confirm(t(translation.Templates.RemoveConfirm, { name: selectedImportedTemplate.name }));

    if (!confirmed) {
      return;
    }

    try {
      setBusy(true);
      setErrorMessage(null);
      const removedTemplateName = selectedImportedTemplate.name;
      await onDeleteTemplate(selectedImportedTemplate.id);
      setStatusMessage(t(translation.Templates.RemovedSuccess, { name: removedTemplateName }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t(translation.Templates.RemoveError));
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteFromCard = async (
    event: React.MouseEvent,
    templateId: string,
    templateName: string
  ) => {
    event.stopPropagation();

    const confirmed = globalThis.confirm(t(translation.Templates.RemoveConfirm, { name: templateName }));
    if (!confirmed) return;

    try {
      setDeletingId(templateId);
      setErrorMessage(null);
      await onDeleteTemplate(templateId);
      setStatusMessage(t(translation.Templates.RemovedSuccess, { name: templateName }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t(translation.Templates.RemoveError));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t(translation.Templates.Eyebrow)}
        title={t(translation.Templates.Title)}
        description={t(translation.Templates.Description)}
        icon="package"
      />

      {importedTemplateOptions.length === 0 ? (
        <section className="rounded-[24px] border border-border bg-soft p-6 shadow-panel">
          <BodyText tone="muted" className="leading-6">
            {t(translation.Templates.Empty)}
          </BodyText>
        </section>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-2">
            {importedTemplateOptions.map((template) => (
              <ImportedTemplateCard
                key={template.id}
                template={template}
                active={template.id === selectedImportedTemplateId}
                isDeleting={deletingId === template.id}
                disabled={busy}
                onSelect={onSelectTemplate}
                onDelete={handleDeleteFromCard}
              />
            ))}
          </section>

          {selectedImportedTemplate ? (
            <>
              <section className="rounded-[24px] border border-border bg-soft p-6 shadow-panel">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <label className="block flex-1">
                    <OverlineText as="span" className="tracking-[0.22em]">
                      {t(translation.Templates.TemplateName)}
                    </OverlineText>
                    <TextInput
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      placeholder={t(translation.Templates.ImportedTemplate)}
                      icon="package"
                      className="mt-3"
                    />
                  </label>

                  <div className="flex flex-wrap justify-end gap-3 self-end lg:max-w-md">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleDelete()}
                      className="inline-flex items-center justify-center rounded-[16px] border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:border-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {t(translation.Templates.RemoveTemplate)}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleSave()}
                      className="inline-flex items-center justify-center rounded-[16px] border border-transparent bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accentHover disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {t(translation.Templates.SaveChanges)}
                    </button>
                  </div>
                </div>

                {errorMessage ? (
                  <BodyText className="mt-4 rounded-[16px] border border-red-300/40 bg-red-50 px-4 py-3 text-red-700">
                    {errorMessage}
                  </BodyText>
                ) : null}
                {statusMessage ? (
                  <BodyText className="mt-4 rounded-[16px] border border-emerald-300/40 bg-emerald-50 px-4 py-3 text-emerald-800">
                    {statusMessage}
                  </BodyText>
                ) : null}
              </section>

              <ProjectTreeEditorPanel
                busy={busy}
                eyebrow={t(translation.Templates.EditorEyebrow)}
                title={t(translation.Templates.EditorTitle)}
                description={t(translation.Templates.EditorDesc)}
                projectName={selectedImportedTemplate.name}
                templateId="imported-template"
                templateLabel={selectedImportedTemplate.name}
                selectedStructurePaths={[]}
                initialTree={selectedImportedTemplate.tree}
                useScaffoldBaseline={false}
                replaceTreeOnInitialChange
                primaryActionLabel={t(translation.Templates.SaveChanges)}
                onPrimaryAction={() => void handleSave()}
                onTreeChange={setDraftTree}
              />
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
