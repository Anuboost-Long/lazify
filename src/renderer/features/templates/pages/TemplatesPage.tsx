import { useMemo, useState } from "react";
import { translation } from "@renderer/i18n/translation";
import { BodyText, OverlineText, PillText, SectionTitle } from "@renderer/shared/typography";
import type { ImportedTemplateOption } from "@renderer/shared/types/lazify";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { ImportedTemplateCard } from "@renderer/shared/ui/ImportedTemplateCard";
import { PageHero } from "@renderer/shared/ui/PageHero";
import { TextInput } from "@renderer/shared/ui/form/FormInput";
import { useTranslation } from "react-i18next";
import { PageCrumb } from "@renderer/app/components/PageChrome";

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
      <PageCrumb>
        <span className="text-xs text-muted/50">/</span>
        <span className="text-xs font-medium text-text">
          {t(translation.Templates.SavedTemplates)}
        </span>
      </PageCrumb>

      <PageHero
        eyebrow={translation.Templates.Eyebrow}
        title={translation.Templates.Title}
        description={translation.Templates.Description}
      >
        <button
          type="button"
          aria-label={t(translation.Templates.ImportProject)}
          onClick={onImportProject}
          className="group inline-flex w-full max-w-[560px] items-center gap-3 self-start rounded-[18px] border border-accent/25 bg-accent/[0.07] px-4 py-3 text-left transition-[transform,border-color,background-color] hover:-translate-y-0.5 hover:border-accent hover:bg-accent/10 lg:ml-auto lg:self-auto"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-accent text-white shadow-sm">
            <UiIcon name="import" className="h-5 w-5" />
          </div>
          <span className="min-w-0 flex-1">
            <BodyText className="font-semibold">
              {t(translation.Templates.ImportProject)}
            </BodyText>
            <BodyText tone="muted" className="mt-0.5 text-xs">
              {t(translation.Templates.ImportProjectDescription)}
            </BodyText>
          </span>
          <UiIcon name="arrow-right" className="h-4 w-4 text-accent transition-transform group-hover:translate-x-1" />
        </button>
      </PageHero>

      {errorMessage ? (
        <BodyText className="rounded-[16px] border border-error/30 bg-error/10 px-4 py-3 text-error">
          {errorMessage}
        </BodyText>
      ) : null}
      {statusMessage ? (
        <BodyText className="rounded-[16px] border border-success/30 bg-success/10 px-4 py-3 text-success">
          {statusMessage}
        </BodyText>
      ) : null}

      {importedTemplateOptions.length === 0 ? (
        <section className="relative overflow-hidden rounded-[28px] border border-dashed border-border bg-bg/55 px-6 py-12 text-center">
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
          <section className="relative overflow-hidden rounded-[24px] border border-border bg-soft p-4 shadow-sm sm:p-5">
            <div className="absolute inset-y-0 left-0 w-1 bg-accent/70" />
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
              <div className="min-w-0 xl:w-64 xl:shrink-0">
                <div className="flex items-center gap-2">
                  <OverlineText className="tracking-[0.22em]">
                    {t(translation.Templates.Library)}
                  </OverlineText>
                  <PillText className="rounded-full border border-border bg-bg px-2.5 py-1 text-muted">
                    {filteredTemplates.length}/{importedTemplateOptions.length}
                  </PillText>
                </div>
                <BodyText tone="muted" className="mt-1 text-xs">
                  {t(translation.Templates.SearchHint)}
                </BodyText>
              </div>

              <div className="relative min-w-0 flex-1">
                <TextInput
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  icon="search"
                  placeholder={t(translation.Templates.SearchPlaceholder)}
                  aria-label={t(translation.Templates.SearchPlaceholder)}
                  className="!min-h-[48px] !rounded-[16px] bg-bg/80 pr-11"
                  inputClassName="text-[15px]"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label={t(translation.Templates.ClearSearch)}
                    className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors hover:bg-text/10 hover:text-text"
                  >
                    <UiIcon name="xmark" className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
          </section>

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
    </div>
  );
}
