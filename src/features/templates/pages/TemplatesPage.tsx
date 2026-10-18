import { useMemo, useState } from "react";
import { translation } from "@/i18n/translation";
import { BodyText, PillText, SectionTitle } from "@/shared/typography";
import type { ImportedTemplateOption } from "@/shared/types/lazify";
import UiIcon from "@/shared/ui/icons/UiIcon";
import { ImportedTemplateCard } from "@/shared/ui/ImportedTemplateCard";
import { LabelButton } from "@/shared/ui/LabelButton";
import { Toast } from "@/shared/ui/toast/Toast";
import { useTranslation } from "react-i18next";
import { PageActions, PageCrumb } from "@/app/components/PageChrome";
import { SearchInput } from "@/shared/ui/form/SearchInput";
import { ConfirmModal } from "@/shared/ui/modal/ConfirmModal";

interface TemplatesPageProps {
  importedTemplateOptions: ImportedTemplateOption[];
  onSelectTemplate: (templateId: string) => void;
  onDeleteTemplate: (templateId: string) => Promise<void>;
  onImportProject: () => void;
}

export function TemplatesPage({
  importedTemplateOptions,
  onSelectTemplate,
  onDeleteTemplate,
  onImportProject,
}: Readonly<TemplatesPageProps>) {
  const { t } = useTranslation();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const filteredTemplates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return importedTemplateOptions;

    return importedTemplateOptions.filter((template) =>
      [
        template.name,
        template.description,
        template.stack,
        template.sourceProjectPath,
      ].some((value) => value.toLowerCase().includes(query))
    );
  }, [importedTemplateOptions, searchQuery]);

  const handleDeleteFromCard = (
    event: React.MouseEvent,
    templateId: string,
    templateName: string
  ) => {
    event.stopPropagation();
    setPendingDelete({ id: templateId, name: templateName });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { id: templateId, name: templateName } = pendingDelete;
    setPendingDelete(null);

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
      <PageCrumb>
        <span className="text-xs text-muted/50">/</span>
        <span className="text-xs font-medium text-text">
          {t(translation.Templates.SavedTemplates)}
        </span>
      </PageCrumb>

      <PageActions>
        <LabelButton
          label={translation.Templates.ImportProject}
          icon="import"
          variant="accent"
          onClick={onImportProject}
        />
      </PageActions>

      {errorMessage ? (
        <Toast
          title={t(translation.Templates.RemoveFailed)}
          message={errorMessage}
          onClose={() => setErrorMessage(null)}
        />
      ) : null}
      {statusMessage ? (
        <Toast
          variant="success"
          title={t(translation.Templates.Removed)}
          message={statusMessage}
          onClose={() => setStatusMessage(null)}
        />
      ) : null}

      {importedTemplateOptions.length === 0 ? (
        <section className="relative overflow-hidden rounded-shell border border-dashed border-border bg-bg/55 px-6 py-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-accent/20 bg-accent/[0.07] text-accent">
            <UiIcon name="package" className="h-7 w-7" />
          </div>
          <SectionTitle className="mt-5 text-xl">
            {t(translation.Templates.EmptyTitle)}
          </SectionTitle>
          <BodyText tone="muted" className="mx-auto mt-2 max-w-xl leading-6">
            {t(translation.Templates.Empty)}
          </BodyText>
        </section>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <SearchInput
              size="md"
              className="sm:max-w-xs"
              label={t(translation.Templates.SearchPlaceholder)}
              clearLabel={t(translation.Templates.ClearSearch)}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <PillText className="tabular-nums">
              {filteredTemplates.length}/{importedTemplateOptions.length}
            </PillText>
          </div>

          {filteredTemplates.length > 0 ? (
            <section className="grid gap-4 xl:grid-cols-2">
              {filteredTemplates.map((template) => (
                <ImportedTemplateCard
                  key={template.id}
                  template={template}
                  active={false}
                  isDeleting={deletingId === template.id}
                  onSelect={onSelectTemplate}
                  onDelete={handleDeleteFromCard}
                />
              ))}
            </section>
          ) : (
            <section className="rounded-[26px] border border-dashed border-border bg-bg/50 px-6 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[16px] border border-border bg-soft text-muted">
                <UiIcon name="search" className="h-5 w-5" />
              </div>
              <SectionTitle className="mt-4 text-lg">
                {t(translation.Templates.NoSearchResults)}
              </SectionTitle>
              <BodyText tone="muted" className="mt-2">
                {t(translation.Templates.NoSearchResultsDesc, { query: searchQuery })}
              </BodyText>
            </section>
          )}
        </>
      )}

      <ConfirmModal
        open={pendingDelete !== null}
        title={t(translation.Templates.RemoveTemplate)}
        description={
          pendingDelete
            ? t(translation.Templates.RemoveConfirm, { name: pendingDelete.name })
            : undefined
        }
        confirmLabel={t(translation.GlobalTerm.Delete)}
        destructive
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
