import { useEffect, useState } from "react";
import clsx from "clsx";
import { PageHeader } from "@renderer/shared/ui/PageHeader";
import { ProjectTreeEditorPanel } from "@renderer/shared/ui/project-tree/ProjectTreeEditorPanel";
import type { TreeNode } from "@renderer/shared/ui/project-tree/types";
import type {
  ImportedTemplateOption,
  ImportedTemplateSnapshot,
} from "@renderer/shared/types/lazify";
import { TextInput } from "@renderer/shared/ui/form/FormInput";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

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
  const [draftName, setDraftName] = useState("");
  const [draftTree, setDraftTree] = useState<TreeNode[]>([]);
  const [busy, setBusy] = useState(false);
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
      setStatusMessage(`Saved changes to "${savedTemplate.name}".`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update the imported template.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedImportedTemplate) {
      return;
    }

    const confirmed = window.confirm(`Remove imported template "${selectedImportedTemplate.name}"?`);

    if (!confirmed) {
      return;
    }

    try {
      setBusy(true);
      setErrorMessage(null);
      const removedTemplateName = selectedImportedTemplate.name;
      await onDeleteTemplate(selectedImportedTemplate.id);
      setStatusMessage(`Removed "${removedTemplateName}" from saved imported templates.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to remove the imported template.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Imported Templates"
        title="Templates"
        description="Review saved imported project templates, rename them, edit their file trees, and remove snapshots you no longer want to keep."
        icon="package"
      />

      {importedTemplateOptions.length === 0 ? (
        <section className="rounded-[24px] border border-border bg-soft p-6 shadow-panel">
          <p className="text-sm leading-6 text-muted">
            No imported templates have been saved yet. Go to Import Project, choose the files to keep, and save the result as a template.
          </p>
        </section>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-2">
            {importedTemplateOptions.map((template) => {
              const active = template.id === selectedImportedTemplateId;

              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onSelectTemplate(template.id)}
                  className={clsx(
                    "rounded-shell border p-5 text-left shadow-panel",
                    active ? "border-border bg-accentSoft" : "border-border bg-soft hover:border-accent"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-bg text-accent">
                        <UiIcon name="package" className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-text">{template.name}</p>
                        <p className="text-sm text-muted">{template.description}</p>
                      </div>
                    </div>
                    {active ? (
                      <div className="flex items-center gap-2 rounded-full border border-border bg-accentSoft px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                        <UiIcon name="check-circle" className="h-4 w-4 text-accent" />
                        Active
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted">
                    <span>{template.fileCount} files</span>
                    <span>{new Date(template.savedAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-muted">{template.sourceProjectPath}</p>
                </button>
              );
            })}
          </section>

          {selectedImportedTemplate ? (
            <>
              <section className="rounded-[24px] border border-border bg-soft p-6 shadow-panel">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <label className="block flex-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                      Template name
                    </span>
                    <TextInput
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      placeholder="Imported template"
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
                      Remove template
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleSave()}
                      className="inline-flex items-center justify-center rounded-[16px] border border-transparent bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accentHover disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Save template changes
                    </button>
                  </div>
                </div>

                {errorMessage ? (
                  <p className="mt-4 rounded-[16px] border border-red-300/40 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMessage}
                  </p>
                ) : null}
                {statusMessage ? (
                  <p className="mt-4 rounded-[16px] border border-emerald-300/40 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {statusMessage}
                  </p>
                ) : null}
              </section>

              <ProjectTreeEditorPanel
                busy={busy}
                eyebrow="Template Editor"
                title="Edit saved imported template"
                description="Adjust the saved file tree before reusing this import as a starting point for the next project."
                projectName={selectedImportedTemplate.name}
                templateId="imported-template"
                templateLabel={selectedImportedTemplate.name}
                selectedStructurePaths={[]}
                initialTree={selectedImportedTemplate.tree}
                useScaffoldBaseline={false}
                replaceTreeOnInitialChange
                primaryActionLabel="Save template changes"
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
