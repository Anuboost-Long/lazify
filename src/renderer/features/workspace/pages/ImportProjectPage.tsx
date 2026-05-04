import { startTransition, useState } from "react";
import { PageHeader } from "@renderer/shared/ui/PageHeader";
import type {
  ImportedProjectIndexResult,
  StackDetectionResult
} from "@renderer/shared/types/lazify";
import { OptimizedImportedProjectTree } from "@renderer/shared/ui/project-tree-optimized/OptimizedImportedProjectTree";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";

function formatStackLabel(value: string) {
  return value
    .split("-")
    .map((segment) => {
      if (segment === "js") {
        return "JS";
      }

      return segment.charAt(0).toUpperCase() + segment.slice(1);
    })
    .join(" ");
}

function formatConfidence(confidence: number) {
  return `${Math.round(confidence * 100)}%`;
}

function DetectionSummary({ stackDetection }: { stackDetection: StackDetectionResult }) {
  return (
    <section className="rounded-[24px] border border-border bg-soft p-6 shadow-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            Detected stack
          </p>
          <p className="mt-2 text-xl font-semibold text-text">
            {formatStackLabel(stackDetection.stack)}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Framework: {formatStackLabel(stackDetection.framework)} · Meta-framework:{" "}
            {formatStackLabel(stackDetection.metaFramework)} · Package manager:{" "}
            {formatStackLabel(stackDetection.packageManager)}
          </p>
        </div>

        <div className="rounded-full border border-border bg-bg px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          Confidence {formatConfidence(stackDetection.confidence)}
        </div>
      </div>

      {stackDetection.reasons.length > 0 ? (
        <p className="mt-4 text-sm leading-6 text-muted">
          {stackDetection.reasons.join(". ")}.
        </p>
      ) : null}

      {stackDetection.warnings.length > 0 ? (
        <p className="mt-4 rounded-[16px] border border-amber-300/40 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {stackDetection.warnings.join(" ")}
        </p>
      ) : null}
    </section>
  );
}

export function ImportProjectPage() {
  const { importedTemplateOptions, refreshImportedTemplates } = useLazifyStore();
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ImportedProjectIndexResult | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleChooseFolder = async () => {
    try {
      setErrorMessage(null);
      setSaveMessage(null);
      const selectedPath = await window.lazify.selectDirectory();

      if (!selectedPath) {
        return;
      }

      setBusy(true);
      const result = await window.lazify.importProjectIndexFromDirectory(selectedPath);
      startTransition(() => {
        setScanResult(result);
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to import the selected project.");
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
      const result = await window.lazify.importProjectIndexFromDirectory(scanResult.projectPath);
      startTransition(() => {
        setScanResult(result);
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to rescan the selected project.");
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
      setErrorMessage("Select the project stack before saving the imported template.");
      return;
    }

    try {
      setErrorMessage(null);
      const template = await window.lazify.saveImportedTemplate(
        scanResult.projectPath,
        includedRelativePaths,
        providedName,
        selectedStack
      );
      await refreshImportedTemplates();
      setSaveMessage(
        `Saved template "${template.name}" as JSON with ${includedRelativePaths.length} file${includedRelativePaths.length === 1 ? "" : "s"}.`
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save the imported template.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Import Workflow"
        title="Import Project"
        description="Choose a project folder from your machine, scan its files, and inspect the imported structure in the shared project tree."
        icon="import"
      />

      <section className="rounded-[24px] border border-border bg-soft p-6 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Project folder
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">
              {scanResult?.projectPath ?? "No project folder selected yet."}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted">
              Large generated directories like `node_modules`, `.git`, `dist`, and `build` are skipped to keep the scan usable.
            </p>
            {importedTemplateOptions.length > 0 ? (
              <p className="mt-2 text-xs leading-5 text-emerald-700">
                {importedTemplateOptions.length} imported template{importedTemplateOptions.length === 1 ? "" : "s"} saved on disk.
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap justify-end gap-3 self-end lg:max-w-sm">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleChooseFolder()}
              className="inline-flex items-center justify-center rounded-[16px] border border-border bg-bg px-4 py-2.5 text-sm font-semibold text-text hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {scanResult ? "Choose another folder" : "Choose project folder"}
            </button>
            {scanResult ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRescan()}
                className="inline-flex items-center justify-center rounded-[16px] border border-border bg-bg px-4 py-2.5 text-sm font-semibold text-text hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                Rescan
              </button>
            ) : null}
          </div>
        </div>

        {errorMessage ? (
          <p className="mt-4 rounded-[16px] border border-red-300/40 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}
        {saveMessage ? (
          <p className="mt-4 rounded-[16px] border border-emerald-300/40 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {saveMessage}
          </p>
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
          <p className="text-sm leading-6 text-muted">
            Choose a project folder to scan and load its file tree.
          </p>
        </section>
      )}
    </div>
  );
}
