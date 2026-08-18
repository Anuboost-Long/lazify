import { startTransition, useState } from "react";
import { PageActions, PageCrumb } from "@renderer/app/components/PageChrome";
import { translation } from "@renderer/i18n/translation";
import { BodyText, CardTitle, MonoText, OverlineText, PillText, SectionTitle } from "@renderer/shared/typography";
import type {
  ImportedProjectIndexResult,
  StackDetectionResult
} from "@renderer/shared/types/lazify";
import { OptimizedImportedProjectTree } from "@renderer/shared/ui/project-tree-optimized/OptimizedImportedProjectTree";
import { formatStackLabel } from "@renderer/shared/lib/stack-label";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";
import { useTranslation } from "react-i18next";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

function formatConfidence(confidence: number) {
  return `${Math.round(confidence * 100)}%`;
}

function DetectionSummary({ stackDetection }: { stackDetection: StackDetectionResult }) {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden rounded-[26px] border border-border bg-soft p-6 shadow-panel">
      <div className="absolute inset-y-0 left-0 w-1 bg-accent" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <OverlineText className="tracking-[0.22em]">
            {t(translation.ImportProject.DetectedStack)}
          </OverlineText>
          <CardTitle className="mt-2 text-xl">
            {formatStackLabel(stackDetection.stack)}
          </CardTitle>
        </div>

        <PillText className="rounded-full border border-success/25 bg-success/10 px-4 py-2 text-xs tracking-[0.2em] text-success">
          {t(translation.ImportProject.Confidence, { value: formatConfidence(stackDetection.confidence) })}
        </PillText>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          [translation.ImportProject.Framework, stackDetection.framework],
          [translation.ImportProject.MetaFramework, stackDetection.metaFramework],
          [translation.ImportProject.PackageManager, stackDetection.packageManager],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[18px] border border-border bg-bg/70 px-4 py-3">
            <OverlineText tone="muted" className="text-[10px] tracking-[0.2em]">
              {t(label)}
            </OverlineText>
            <BodyText className="mt-1 font-semibold">
              {formatStackLabel(value)}
            </BodyText>
          </div>
        ))}
      </div>

      {stackDetection.reasons.length > 0 ? (
        <BodyText tone="muted" className="mt-4 leading-6">
          {stackDetection.reasons.join(". ")}.
        </BodyText>
      ) : null}

      {stackDetection.warnings.length > 0 ? (
        <BodyText className="mt-4 rounded-[16px] border border-amber-300/40 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300">
          {stackDetection.warnings.join(" ")}
        </BodyText>
      ) : null}
    </section>
  );
}

interface ImportTemplatePageProps {
  onBack: () => void;
  onTemplateSaved: (templateId: string) => Promise<void>;
}

export function ImportTemplatePage({ onBack, onTemplateSaved }: ImportTemplatePageProps) {
  const { t } = useTranslation();
  const { importedTemplateOptions, refreshImportedTemplates } = useLazifyStore();
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ImportedProjectIndexResult | null>(null);

  const handleChooseFolder = async () => {
    try {
      setErrorMessage(null);
      const selectedPath = await globalThis.lazify.selectDirectory();

      if (!selectedPath) {
        return;
      }

      setBusy(true);
      const result = await globalThis.lazify.importProjectIndexFromDirectory(selectedPath);
      startTransition(() => {
        setScanResult(result);
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t(translation.ImportProject.ImportError));
    } finally {
      setBusy(false);
    }
  };

  const handleRescan = async () => {
    if (!scanResult?.projectPath) {
      return;
    }

    try {
      setErrorMessage(null);
      setBusy(true);
      const result = await globalThis.lazify.importProjectIndexFromDirectory(scanResult.projectPath);
      startTransition(() => {
        setScanResult(result);
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t(translation.ImportProject.RescanError));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveTemplate = async (
    includedRelativePaths: string[],
    providedName: string,
    selectedStack: string
  ) => {
    if (!scanResult) {
      return;
    }

    if (!selectedStack) {
      setErrorMessage(t(translation.ProjectTree.SelectStackWarning));
      return;
    }

    try {
      setErrorMessage(null);
      const template = await globalThis.lazify.saveImportedTemplate(
        scanResult.projectPath,
        includedRelativePaths,
        providedName,
        selectedStack
      );
      await refreshImportedTemplates();
      await onTemplateSaved(template.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t(translation.ImportProject.SaveError));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageCrumb>
        <span className="text-xs text-muted/50">/</span>
        <span className="text-xs font-medium text-text">
          {t(translation.Templates.ImportProject)}
        </span>
      </PageCrumb>

      <PageActions>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-soft px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:border-accent hover:text-accent"
        >
          {t(translation.GlobalTerm.Back)}
        </button>
      </PageActions>

      <section className="relative overflow-hidden rounded-[30px] border border-border bg-soft px-6 py-6 shadow-panel lg:px-8 lg:py-8">
        <div className="absolute -right-14 -top-20 h-48 w-48 rotate-12 rounded-[52px] border border-accent/15 bg-accent/[0.04]" />
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(480px,0.9fr)] xl:items-end">
          <div>
            <OverlineText className="tracking-[0.24em]">
              {t(translation.ImportProject.Eyebrow)}
            </OverlineText>
            <SectionTitle className="mt-2 text-3xl">
              {t(translation.ImportProject.Title)}
            </SectionTitle>
            <BodyText tone="muted" className="mt-3 max-w-2xl leading-6">
              {t(translation.ImportProject.Description)}
            </BodyText>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
            {([
              ["01", translation.ImportProject.ProjectFolder, "folder" as const],
              ["02", translation.ImportProject.ReviewFiles, "journal-page" as const],
              ["03", translation.ImportProject.SaveTemplate, "package" as const],
            ] as const).map(([number, label, icon], index) => (
              <div key={number} className="contents">
                {index > 0 ? <div className="h-px bg-border" /> : null}
                <div className="rounded-[18px] border border-border bg-bg/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <PillText tone={index === 0 ? "accent" : "muted"}>{number}</PillText>
                    <UiIcon name={icon} className={index === 0 ? "h-4 w-4 text-accent" : "h-4 w-4 text-muted"} />
                  </div>
                  <BodyText className="mt-2 text-xs font-semibold">{t(label)}</BodyText>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[26px] border border-border bg-soft p-6 shadow-panel">
        <div className="absolute inset-y-0 left-0 w-1 bg-accent" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <OverlineText className="tracking-[0.22em]">
              {t(translation.ImportProject.ProjectFolder)}
            </OverlineText>
            <div className="mt-3 flex min-w-0 items-center gap-3 rounded-[18px] border border-border bg-bg/70 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-accent/10 text-accent">
                <UiIcon name="folder" className="h-4 w-4" />
              </div>
              <MonoText className="min-w-0 truncate text-text/80">
                {scanResult?.projectPath ?? t(translation.ImportProject.NoFolderSelected)}
              </MonoText>
            </div>
            <BodyText tone="muted" className="mt-2 text-xs leading-5">
              {t(translation.ImportProject.SkipNotice)}
            </BodyText>
            {importedTemplateOptions.length > 0 ? (
              <BodyText className="mt-2 text-xs leading-5 text-success">
                {t(translation.ImportProject.SavedTemplatesCount, { count: importedTemplateOptions.length })}
              </BodyText>
            ) : null}
          </div>

          <div className="flex flex-wrap justify-end gap-3 self-end lg:max-w-sm">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleChooseFolder()}
              className="inline-flex items-center justify-center gap-2 rounded-[16px] bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accentHover disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UiIcon name={busy ? "refresh-circle" : "folder-plus"} className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              {busy
                ? t(translation.GlobalTerm.Scanning)
                : scanResult
                  ? t(translation.ImportProject.ChooseAnother)
                  : t(translation.ImportProject.ChooseFolder)}
            </button>
            {scanResult ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRescan()}
                className="inline-flex items-center justify-center rounded-[16px] border border-border bg-bg px-4 py-2.5 text-sm font-semibold text-text hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t(translation.GlobalTerm.Rescan)}
              </button>
            ) : null}
          </div>
        </div>

        {errorMessage ? (
          <BodyText className="mt-4 rounded-[16px] border border-error/30 bg-error/10 px-4 py-3 text-error">
            {errorMessage}
          </BodyText>
        ) : null}
      </section>

      {scanResult ? (
        <>
          <DetectionSummary stackDetection={scanResult.stackDetection} />
          <OptimizedImportedProjectTree
            busy={busy}
            editable
            initialConfirmedStack=""
            onSaveTemplate={handleSaveTemplate}
            projectName={scanResult.projectName}
            projectPath={scanResult.projectPath}
            tree={scanResult.tree}
          />
        </>
      ) : (
        <section className="rounded-[28px] border border-dashed border-border bg-bg/55 px-6 py-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-accent/20 bg-accent/[0.07] text-accent">
            <UiIcon name="folder-plus" className="h-7 w-7" />
          </div>
          <SectionTitle className="mt-5 text-xl">
            {t(translation.ImportProject.EmptyTitle)}
          </SectionTitle>
          <BodyText tone="muted" className="mx-auto mt-2 max-w-xl leading-6">
            {t(translation.ImportProject.EmptyPrompt)}
          </BodyText>
        </section>
      )}
    </div>
  );
}
