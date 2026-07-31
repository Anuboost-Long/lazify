import { startTransition, useState } from "react";
import { translation } from "@renderer/i18n/translation";
import { BodyText, CardTitle, OverlineText, PillText } from "@renderer/shared/typography";
import type {
  ImportedProjectIndexResult,
  StackDetectionResult
} from "@renderer/shared/types/lazify";
import { OptimizedImportedProjectTree } from "@renderer/shared/ui/project-tree-optimized/OptimizedImportedProjectTree";
import { formatStackLabel } from "@renderer/features/workspace/utils/stack-label";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";
import { useTranslation } from "react-i18next";

function formatConfidence(confidence: number) {
  return `${Math.round(confidence * 100)}%`;
}

function DetectionSummary({ stackDetection }: { stackDetection: StackDetectionResult }) {
  const { t } = useTranslation();

  return (
    <section className="rounded-[24px] border border-border bg-soft p-6 shadow-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <OverlineText className="tracking-[0.22em]">
            {t(translation.ImportProject.DetectedStack)}
          </OverlineText>
          <CardTitle className="mt-2 text-xl">
            {formatStackLabel(stackDetection.stack)}
          </CardTitle>
          <BodyText tone="muted" className="mt-2 leading-6">
            {t(translation.ImportProject.Framework)}: {formatStackLabel(stackDetection.framework)} · {t(translation.ImportProject.MetaFramework)}:{" "}
            {formatStackLabel(stackDetection.metaFramework)} · {t(translation.ImportProject.PackageManager)}:{" "}
            {formatStackLabel(stackDetection.packageManager)}
          </BodyText>
        </div>

        <PillText className="rounded-full border border-border bg-bg px-4 py-2 text-xs tracking-[0.2em]">
          {t(translation.ImportProject.Confidence, { value: formatConfidence(stackDetection.confidence) })}
        </PillText>
      </div>

      {stackDetection.reasons.length > 0 ? (
        <BodyText tone="muted" className="mt-4 leading-6">
          {stackDetection.reasons.join(". ")}.
        </BodyText>
      ) : null}

      {stackDetection.warnings.length > 0 ? (
        <BodyText className="mt-4 rounded-[16px] border border-amber-300/40 bg-amber-50 px-4 py-3 text-amber-800">
          {stackDetection.warnings.join(" ")}
        </BodyText>
      ) : null}
    </section>
  );
}

export function ImportProjectPage() {
  const { t } = useTranslation();
  const { importedTemplateOptions, refreshImportedTemplates } = useLazifyStore();
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ImportedProjectIndexResult | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleChooseFolder = async () => {
    try {
      setErrorMessage(null);
      setSaveMessage(null);
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
      setSaveMessage(null);
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
      setSaveMessage(
        t(translation.ImportProject.SaveSuccess, { name: template.name, count: includedRelativePaths.length })
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t(translation.ImportProject.SaveError));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[24px] border border-border bg-soft p-6 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <OverlineText className="tracking-[0.22em]">
              {t(translation.ImportProject.ProjectFolder)}
            </OverlineText>
            <BodyText tone="muted" className="mt-2 leading-6">
              {scanResult?.projectPath ?? t(translation.ImportProject.NoFolderSelected)}
            </BodyText>
            <BodyText tone="muted" className="mt-2 text-xs leading-5">
              {t(translation.ImportProject.SkipNotice)}
            </BodyText>
            {importedTemplateOptions.length > 0 ? (
              <BodyText className="mt-2 text-xs leading-5 text-emerald-700">
                {t(translation.ImportProject.SavedTemplatesCount, { count: importedTemplateOptions.length })}
              </BodyText>
            ) : null}
          </div>

          <div className="flex flex-wrap justify-end gap-3 self-end lg:max-w-sm">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleChooseFolder()}
              className="inline-flex items-center justify-center rounded-[16px] border border-border bg-bg px-4 py-2.5 text-sm font-semibold text-text hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {scanResult ? t(translation.ImportProject.ChooseAnother) : t(translation.ImportProject.ChooseFolder)}
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
          <BodyText className="mt-4 rounded-[16px] border border-red-300/40 bg-red-50 px-4 py-3 text-red-700">
            {errorMessage}
          </BodyText>
        ) : null}
        {saveMessage ? (
          <BodyText className="mt-4 rounded-[16px] border border-emerald-300/40 bg-emerald-50 px-4 py-3 text-emerald-800">
            {saveMessage}
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
        <section className="rounded-[24px] border border-border bg-soft p-6 shadow-panel">
          <BodyText tone="muted" className="leading-6">
            {t(translation.ImportProject.EmptyPrompt)}
          </BodyText>
        </section>
      )}
    </div>
  );
}
