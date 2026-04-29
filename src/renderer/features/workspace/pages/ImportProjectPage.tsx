import { startTransition, useState } from "react";
import { PageHeader } from "@renderer/shared/ui/PageHeader";
import type { ImportedProjectIndexResult } from "@renderer/shared/types/lazify";
import { OptimizedImportedProjectTree } from "@renderer/shared/ui/project-tree-optimized/OptimizedImportedProjectTree";

export function ImportProjectPage() {
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ImportedProjectIndexResult | null>(null);

  const handleChooseFolder = async () => {
    try {
      setErrorMessage(null);
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
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleChooseFolder()}
              className="inline-flex items-center justify-center rounded-[16px] border border-border bg-bg px-4 py-2.5 text-sm font-semibold text-text transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {scanResult ? "Choose another folder" : "Choose project folder"}
            </button>
            {scanResult ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRescan()}
                className="inline-flex items-center justify-center rounded-[16px] border border-border bg-bg px-4 py-2.5 text-sm font-semibold text-text transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
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
      </section>

      {scanResult ? (
        <OptimizedImportedProjectTree
          busy={busy}
          projectName={scanResult.projectName}
          projectPath={scanResult.projectPath}
          tree={scanResult.tree}
        />
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
