import clsx from "clsx";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { TemplateOption } from "@renderer/shared/types/lazify";
import { PackageSearchPicker } from "./PackageSearchPicker";

interface WorkflowFormProps {
  projectName: string;
  projectDirectory: string;
  packageName: string;
  selectedTemplateId: string;
  templateOptions: TemplateOption[];
  busy: boolean;
  onProjectNameChange: (value: string) => void;
  onPackageNameChange: (value: string) => void;
  onBrowseDirectory: () => void;
  onContinue: () => void;
}

export function WorkflowForm({
  projectName,
  projectDirectory,
  packageName,
  selectedTemplateId,
  templateOptions,
  busy,
  onProjectNameChange,
  onPackageNameChange,
  onBrowseDirectory,
  onContinue
}: WorkflowFormProps) {
  const selectedTemplate = templateOptions.find((template) => template.id === selectedTemplateId);
  const canContinue = Boolean(projectName.trim() && projectDirectory.trim()) && !busy;
  const inputClassName = clsx(
    "w-full",
    "rounded-[20px] border border-border bg-bg px-4 py-3",
    "text-sm text-text placeholder:text-muted",
    "outline-none transition",
    "focus:border-accent focus:ring-2 focus:ring-accentSoft"
  );
  const pillClassName = clsx(
    "flex items-center gap-2",
    "rounded-full border border-border bg-bg px-3 py-2",
    "text-xs font-semibold uppercase tracking-[0.22em] text-accent"
  );

  return (
    <div className="flex flex-col gap-5 animate-fadeIn opacity-0">
      <section className="relative overflow-hidden rounded-[30px] border border-border bg-soft p-6 shadow-panel">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-80"
          style={{
            background:
              "linear-gradient(135deg, rgba(52, 211, 153, 0.18) 0%, rgba(52, 211, 153, 0.04) 42%, transparent 85%)"
          }}
        />

        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                Project setup
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-text">
                {selectedTemplate?.label ?? "Selected template"}
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted">
                Start by naming the project and pointing Lazify to the base directory before the later workflow steps kick in.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className={pillClassName}>
                {selectedTemplate?.label ?? "Template"}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Project name</span>
              <input
                value={projectName}
                onChange={(event) => onProjectNameChange(event.target.value)}
                placeholder="awesome-mobile-app"
                className={inputClassName}
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Workspace directory</span>
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="flex min-h-[52px] flex-1 items-center rounded-[20px] border border-border bg-bg px-4 py-3 text-sm text-text">
                  <span className={projectDirectory ? "truncate" : "text-muted"}>
                    {projectDirectory || "Choose a folder from your operating system"}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={onBrowseDirectory}
                  className={clsx(
                    "group flex items-center justify-center gap-2",
                    "rounded-[20px] border border-border bg-bg px-4 py-3",
                    "text-sm font-semibold text-muted",
                    "transition hover:border-accent hover:text-text",
                    "disabled:cursor-not-allowed disabled:opacity-60"
                  )}
                >
                  <UiIcon name="folder" className="h-5 w-5 text-muted group-hover:text-accent" />
                  Browse
                </button>
              </div>
            </label>
          </div>
        </div>
      </section>

      <div>
        <PackageSearchPicker
          value={packageName}
          selectedTemplateId={selectedTemplateId}
          busy={busy}
          onChange={onPackageNameChange}
        />
      </div>

      <div className="rounded-[30px] border border-border bg-soft p-6 shadow-panel">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-soft text-accent">
              <UiIcon name="play" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent">
                Setup stage ready
              </p>
              <p className="mt-2 text-lg font-semibold text-text">
                Continue with the next workflow step.
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                This step captures the project name, target directory, and package shortlist.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={!canContinue}
            onClick={onContinue}
            className={clsx(
              "inline-flex items-center justify-center gap-2 rounded-[18px] border border-transparent bg-accent px-5 py-3",
              "text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 hover:bg-accentHover",
              "disabled:cursor-not-allowed disabled:opacity-60"
            )}
          >
            Continue
            <UiIcon name="arrow-right" className="h-4 w-4 text-white" />
          </button>
        </div>

        {!canContinue ? (
          <p className="mt-3 text-sm text-muted">
            Enter both a project name and workspace directory to continue.
          </p>
        ) : null}
      </div>
    </div>
  );
}
