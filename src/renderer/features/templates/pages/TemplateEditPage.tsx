import { PageCrumb } from "@renderer/app/components/PageChrome";
import { TemplateTreeEditor } from "@renderer/features/templates/components/TemplateTreeEditor";
import { translation } from "@renderer/i18n/translation";
import type {
  ImportedTemplateSnapshot,
  ProjectTreeNode as TreeNode,
} from "@renderer/shared/types/lazify";
import { BodyText, OverlineText, PillText } from "@renderer/shared/typography";
import { TextInput } from "@renderer/shared/ui/form/FormInput";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface TemplateEditPageProps {
  template: ImportedTemplateSnapshot | null;
  loadError?: string | null;
  onBack: () => void;
  onSaveTemplate: (
    templateId: string,
    updates: { name?: string | null; tree?: TreeNode[] | null },
  ) => Promise<ImportedTemplateSnapshot>;
  onDeleteTemplate: (templateId: string) => Promise<void>;
}

export function TemplateEditPage({
  template,
  loadError = null,
  onBack,
  onSaveTemplate,
  onDeleteTemplate,
}: Readonly<TemplateEditPageProps>) {
  const { t } = useTranslation();
  const [draftName, setDraftName] = useState("");
  const [draftTree, setDraftTree] = useState<TreeNode[]>([]);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraftName(template?.name ?? "");
    setDraftTree(template?.tree ?? []);
    setErrorMessage(null);
    setStatusMessage(null);
  }, [template]);

  const handleSave = async () => {
    if (!template) return;

    try {
      setBusy(true);
      setErrorMessage(null);
      const savedTemplate = await onSaveTemplate(template.id, {
        name: draftName,
        tree: draftTree,
      });
      setDraftName(savedTemplate.name);
      setDraftTree(savedTemplate.tree);
      setStatusMessage(
        t(translation.Templates.SavedSuccess, { name: savedTemplate.name }),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t(translation.Templates.UpdateError),
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!template) return;

    const confirmed = globalThis.confirm(
      t(translation.Templates.RemoveConfirm, { name: template.name }),
    );
    if (!confirmed) return;

    try {
      setBusy(true);
      setErrorMessage(null);
      await onDeleteTemplate(template.id);
      onBack();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t(translation.Templates.RemoveError),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageCrumb onBack={onBack}>
        <span className="text-xs text-muted/50">/</span>
        <span className="text-xs font-medium text-text">
          {template?.name ?? t(translation.Templates.EditorTitle)}
        </span>
      </PageCrumb>

      {loadError ? (
        <BodyText className="rounded-[16px] border border-error/30 bg-error/10 px-4 py-3 text-error">
          {loadError}
        </BodyText>
      ) : null}

      {!template && !loadError ? (
        <BodyText
          tone="muted"
          className="rounded-[20px] border border-border bg-soft px-5 py-4"
        >
          {t(translation.ProjectTree.LoadingFilePreview)}
        </BodyText>
      ) : null}

      {template ? (
        <>
          <section className="relative overflow-hidden rounded-[26px] border border-border bg-soft p-6 shadow-panel">
            <div className="absolute inset-y-0 left-0 w-1 bg-accent" />
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <label className="block flex-1">
                <span className="flex items-center gap-2">
                  <PillText
                    tone="accent"
                    className="rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1"
                  >
                    {t(translation.Templates.Selected)}
                  </PillText>
                  <OverlineText as="span" className="tracking-[0.22em]">
                    {t(translation.Templates.TemplateName)}
                  </OverlineText>
                </span>
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
                  className="inline-flex items-center justify-center rounded-[16px] border border-error/30 bg-error/10 px-4 py-3 text-sm font-semibold text-error hover:border-error/60 disabled:cursor-not-allowed disabled:opacity-60"
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
              <BodyText className="mt-4 rounded-[16px] border border-error/30 bg-error/10 px-4 py-3 text-error">
                {errorMessage}
              </BodyText>
            ) : null}
            {statusMessage ? (
              <BodyText className="mt-4 rounded-[16px] border border-success/30 bg-success/10 px-4 py-3 text-success">
                {statusMessage}
              </BodyText>
            ) : null}
          </section>

          <div className="h-[720px] min-h-[560px] max-h-[calc(100vh-5rem)]">
            <TemplateTreeEditor
              projectName={template.name}
              initialTree={template.tree}
              replaceTreeOnInitialChange
              onTreeChange={setDraftTree}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
