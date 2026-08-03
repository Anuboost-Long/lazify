import { translation } from "@renderer/i18n/translation";
import type { TemplateOption } from "@renderer/shared/types/lazify";
import {
  BodyText,
  CardTitle,
  OverlineText,
  PillText,
  SectionTitle,
} from "@renderer/shared/typography";
import { BackButton } from "@renderer/shared/ui/BackButton";
import { TextInput } from "@renderer/shared/ui/form/FormInput";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { PackageSearchPicker } from "./PackageSearchPicker";
import { TemplateOptionsPanel } from "./TemplateOptionsPanel";

interface WorkflowFormProps {
  sourceMode: "stack" | "imported";
  sourceLabel: string;
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
  createOptionValues: Record<string, boolean>;
  onCreateOptionChange: (key: string, value: boolean) => void;
  onBack?: () => void;
  backLabel?: string;
}

export function WorkflowForm({
  sourceMode,
  sourceLabel,
  projectName,
  projectDirectory,
  packageName,
  selectedTemplateId,
  templateOptions,
  busy,
  onProjectNameChange,
  onPackageNameChange,
  onBrowseDirectory,
  onContinue,
  createOptionValues,
  onCreateOptionChange,
  onBack,
  backLabel,
}: Readonly<WorkflowFormProps>) {
  const { t } = useTranslation();
  const selectedTemplate = templateOptions.find(
    (template) => template.id === selectedTemplateId,
  );
  const canContinue =
    Boolean(projectName.trim() && projectDirectory.trim()) && !busy;
  const pillClassName =
    "flex items-center gap-2 rounded-full border border-border bg-bg px-3 py-2 tracking-[0.22em]";

  return (
    <div className="flex flex-col gap-5 animate-fadeIn opacity-0">
      <section className="rounded-[30px] border border-border bg-soft p-6 shadow-panel">
        <div>
          {/* Header bar: back link on the left, stack pill on the right. */}
          <div className="flex flex-wrap items-center gap-4">
            {onBack ? (
              <BackButton
                label={backLabel ?? t(translation.GlobalTerm.Back)}
                onClick={onBack}
              />
            ) : null}

            <div className="ml-auto flex flex-wrap gap-2">
              <PillText tone="accent" className={pillClassName}>
                {sourceMode === "stack"
                  ? (selectedTemplate?.label ??
                    t(translation.WorkflowForm.Stack))
                  : t(translation.WorkflowForm.ImportedTemplateLabel)}
              </PillText>
            </div>
          </div>

          <div className="mt-6 max-w-2xl">
            <OverlineText>{t(translation.WorkflowForm.Title)}</OverlineText>
            <SectionTitle className="mt-3">{sourceLabel}</SectionTitle>
            <BodyText tone="muted" className="mt-3 leading-6">
              {t(translation.WorkflowForm.Subtitle)}
            </BodyText>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <label className="space-y-2">
              <OverlineText as="span" className="tracking-[0.22em]">
                {t(translation.WorkflowForm.ProjectName)}
              </OverlineText>
              <TextInput
                value={projectName}
                onChange={(event) => onProjectNameChange(event.target.value)}
                placeholder={t(translation.WorkflowForm.ProjectNamePlaceholder)}
                icon="folder"
              />
            </label>

            <label className="space-y-2">
              <OverlineText as="span" className="tracking-[0.22em]">
                {t(translation.WorkflowForm.WorkspaceDirectory)}
              </OverlineText>
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="flex min-h-[52px] flex-1 items-center rounded-[20px] border border-border bg-bg px-4 py-3 text-sm text-text">
                  <BodyText
                    as="span"
                    className={projectDirectory ? "truncate" : "text-muted"}
                  >
                    {projectDirectory ||
                      t(translation.WorkflowForm.ChooseFolder)}
                  </BodyText>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={onBrowseDirectory}
                  className={clsx(
                    "group flex items-center justify-center gap-2",
                    "rounded-[20px] border border-border bg-bg px-4 py-3",
                    "text-sm font-semibold text-muted",
                    "hover:border-accent hover:text-text",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                  )}
                >
                  <UiIcon
                    name="folder"
                    className="h-5 w-5 text-muted group-hover:text-accent"
                  />
                  {t(translation.GlobalTerm.Browse)}
                </button>
              </div>
            </label>
          </div>
        </div>
      </section>

      {sourceMode === "stack" ? (
        <div>
          <PackageSearchPicker
            value={packageName}
            selectedTemplateId={selectedTemplateId}
            busy={busy}
            onChange={onPackageNameChange}
          />
        </div>
      ) : null}

      {/* Stack-only: extra create options for the chosen stack. */}
      {sourceMode === "stack" ? (
        <TemplateOptionsPanel
          options={selectedTemplate?.createOptions ?? []}
          values={createOptionValues}
          busy={busy}
          onChange={onCreateOptionChange}
        />
      ) : null}

      <div className="rounded-[30px] border border-border bg-soft p-6 shadow-panel">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-soft text-accent">
              <UiIcon name="play" className="h-5 w-5" />
            </div>
            <div>
              <OverlineText as="p" className="text-sm tracking-[0.22em]">
                {t(translation.WorkflowForm.SetupReady)}
              </OverlineText>
              <CardTitle className="mt-2">
                {t(translation.WorkflowForm.SetupReadyDesc)}
              </CardTitle>
              <BodyText tone="muted" className="mt-2 leading-6">
                {sourceMode === "stack"
                  ? t(translation.WorkflowForm.StackStepDesc)
                  : t(translation.WorkflowForm.ImportedStepDesc)}
              </BodyText>
            </div>
          </div>

          <button
            type="button"
            disabled={!canContinue}
            onClick={onContinue}
            className={clsx(
              "inline-flex self-end items-center justify-center gap-2 rounded-[18px] border border-transparent bg-accent px-5 py-3",
              "text-sm font-semibold text-white shadow-glow hover:-translate-y-0.5 hover:bg-accentHover",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            {t(translation.GlobalTerm.Continue)}
            <UiIcon name="arrow-right" className="h-4 w-4 text-white" />
          </button>
        </div>

        {!canContinue ? (
          <BodyText tone="muted" className="mt-3">
            {t(translation.WorkflowForm.EnterBoth)}
          </BodyText>
        ) : null}

      </div>
    </div>
  );
}
