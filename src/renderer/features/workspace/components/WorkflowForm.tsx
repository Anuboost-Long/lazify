import { getTechIconName } from "@renderer/shared/lib/icon-map";
import DevIcon from "@renderer/shared/ui/icons/DevIcon";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { TemplateOption } from "@renderer/shared/types/lazify";

interface WorkflowFormProps {
  projectName: string;
  projectDirectory: string;
  packageName: string;
  selectedTemplateId: string;
  templateOptions: TemplateOption[];
  busy: boolean;
  onProjectNameChange: (value: string) => void;
  onPackageNameChange: (value: string) => void;
  onTemplateChange: (value: string) => void;
  onBrowseDirectory: () => void;
  onCreateExpoApp: () => void;
  onInstallPackage: () => void;
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
  onTemplateChange,
  onBrowseDirectory,
  onCreateExpoApp,
  onInstallPackage
}: WorkflowFormProps) {
  const selectedTemplate = templateOptions.find((template) => template.id === selectedTemplateId);
  const templateIconName = getTechIconName(selectedTemplate?.label.toLowerCase().includes("expo") ? "expo" : "react");

  return (
    <section className="relative overflow-hidden rounded-shell border border-border bg-soft p-6 shadow-[0_0_8px_rgba(0,0,0,0.4)] backdrop-blur">
      <div className="absolute -right-10 top-8 h-32 w-32 rounded-full blur-3xl" style={{ backgroundColor: "var(--color-accent-soft)" }} />
      <div className="absolute left-8 top-0 h-20 w-20 animate-drift rounded-full blur-2xl" style={{ backgroundColor: "var(--color-accent-soft)" }} />

      <div className="relative space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Workflows</p>
          <h2 className="mt-2 font-display text-4xl leading-none text-text">Launch dev setups without touching a terminal.</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
            Lazify wraps project creation, dependency installs, background commands, and log streaming into one secure desktop shell.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-full border border-border bg-bg px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              <DevIcon name={templateIconName} className="text-xl text-accent" title={selectedTemplate?.label} />
              {selectedTemplate?.label ?? "Template"}
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border bg-bg px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              <DevIcon name={getTechIconName("npm")} className="text-xl text-accent" title="npm" />
              npm ready
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Project name</span>
            <input
              value={projectName}
              onChange={(event) => onProjectNameChange(event.target.value)}
              placeholder="awesome-mobile-app"
              className="w-full rounded-[20px] border border-border bg-bg px-4 py-3 text-sm text-text outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accentSoft"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Workspace directory</span>
            <div className="flex gap-3">
              <div className="flex min-h-[52px] flex-1 items-center rounded-[20px] border border-border bg-bg px-4 py-3 text-sm text-text">
                <span className={projectDirectory ? "truncate" : "text-muted"}>
                  {projectDirectory || "Choose a folder from your operating system"}
                </span>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={onBrowseDirectory}
                className="group flex items-center gap-2 rounded-[20px] border border-border bg-soft px-4 py-3 text-sm font-semibold text-muted transition hover:border-accent hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
              >
                <UiIcon name="folder" className="h-5 w-5 text-muted group-hover:text-accent" />
                Browse
              </button>
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Template</span>
            <select
              value={selectedTemplateId}
              onChange={(event) => onTemplateChange(event.target.value)}
              className="w-full rounded-[20px] border border-border bg-bg px-4 py-3 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accentSoft"
            >
              {templateOptions.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Package name</span>
            <input
              value={packageName}
              onChange={(event) => onPackageNameChange(event.target.value)}
              placeholder="zustand, react-query"
              className="w-full rounded-[20px] border border-border bg-bg px-4 py-3 text-sm text-text outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accentSoft"
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCreateExpoApp}
            className="bg-accent text-white hover:bg-accentHover rounded-[22px] border border-transparent px-5 py-4 text-left shadow-glow transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
              <UiIcon name="play" className="h-4 w-4 text-white/70" />
              Create
            </div>
            <p className="mt-2 font-display text-2xl">Create Expo App</p>
            <p className="mt-2 text-sm text-white/80">Runs the project scaffold in the background and streams every line into the UI.</p>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={onInstallPackage}
            className="group rounded-[22px] border border-border bg-bg px-5 py-4 text-left text-text shadow-sm transition hover:-translate-y-0.5 hover:border-accent hover:shadow-[0_0_8px_rgba(0,0,0,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted group-hover:text-text">
              <UiIcon name="package" className="h-4 w-4 text-muted group-hover:text-accent" />
              Maintain
            </div>
            <p className="mt-2 font-display text-2xl">Install Package</p>
            <p className="mt-2 text-sm text-muted">Uses the selected directory and retries once with a safe compatibility fallback when installs fail.</p>
          </button>
        </div>
      </div>
    </section>
  );
}
