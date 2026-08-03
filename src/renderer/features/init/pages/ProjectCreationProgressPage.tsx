import type { StarterFailureReason } from "@main/scaffolding/starter-provisioner";
import type { CommandChoicePrompt } from "@main/command-runner";
import { PageCrumb } from "@renderer/app/components/PageChrome";
import { translation } from "@renderer/i18n/translation";
import type {
  EnvironmentSummary,
  LogEntry,
  WorkflowStatus,
} from "@renderer/shared/types/lazify";
import {
  BodyText,
  OverlineText,
  PillText,
  SectionTitle,
} from "@renderer/shared/typography";
import { LogPanel } from "@renderer/shared/ui/LogPanel";
import { StarterFailureNotice } from "@renderer/shared/ui/StarterFailureNotice";
import { StatusStrip } from "@renderer/shared/ui/StatusStrip";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";
import { Toast } from "@renderer/shared/ui/toast/Toast";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface ProjectCreationProgressPageProps {
  commandChoicePrompt: CommandChoicePrompt | null;
  environment: EnvironmentSummary | null;
  logs: LogEntry[];
  projectName: string;
  starterFailureReason: StarterFailureReason | null;
  statusMessage: string;
  workflowStatus: WorkflowStatus;
  onChooseCommandOption: (promptId: string, optionId: string) => void;
}

export function ProjectCreationProgressPage({
  commandChoicePrompt,
  environment,
  logs,
  projectName,
  starterFailureReason,
  statusMessage,
  workflowStatus,
  onChooseCommandOption,
}: ProjectCreationProgressPageProps) {
  const { t } = useTranslation();
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(workflowStatus === "error");
  const prevStatusRef = useRef<WorkflowStatus>(workflowStatus);
  const progressIcon =
    workflowStatus === "error"
      ? "warning-triangle"
      : workflowStatus === "success"
        ? "check-circle"
        : "refresh-circle";

  useEffect(() => {
    if (prevStatusRef.current === "running" && workflowStatus === "success") {
      setShowSuccessToast(true);
    }
    prevStatusRef.current = workflowStatus;
  }, [workflowStatus]);

  useEffect(() => {
    if (workflowStatus === "error") {
      setShowErrorAlert(true);
    } else if (workflowStatus === "running") {
      setShowErrorAlert(false);
    }
  }, [workflowStatus]);

  return (
    <div className="flex flex-col gap-6">
      <PageCrumb>
        <span className="text-xs text-muted/50">/</span>
        <span className="text-xs text-muted">
          {t(translation.Console.SetupStep)}
        </span>
        <span className="text-xs text-muted/50">/</span>
        <span className="text-xs font-medium text-text">
          {t(translation.Console.CreationStep)}
        </span>
      </PageCrumb>

      <section className="relative overflow-hidden rounded-[30px] border border-border bg-soft px-6 py-5 shadow-panel">
        <div className="absolute inset-y-0 left-0 w-1 bg-accent" />
        <div className="absolute -right-12 -top-16 h-40 w-40 rotate-12 rounded-[36px] border border-accent/15 bg-accent/[0.04]" />

        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)] lg:items-end">
          <div>
            <OverlineText className="tracking-[0.24em]">
              {t(translation.Console.FlowEyebrow)}
            </OverlineText>
            <SectionTitle className="mt-2 text-2xl">
              {t(translation.Console.FlowTitle, { name: projectName })}
            </SectionTitle>
            <BodyText tone="muted" className="mt-2 max-w-2xl leading-6">
              {t(translation.Console.FlowDescription)}
            </BodyText>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="rounded-2xl border border-success/25 bg-success/[0.06] px-4 py-3">
              <PillText className="text-success">01</PillText>
              <BodyText className="mt-1 text-sm font-semibold">
                {t(translation.Console.SetupStep)}
              </BodyText>
            </div>

            <div className="h-px w-7 bg-border" />

            <div className="rounded-2xl border border-accent/30 bg-accent/[0.07] px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <PillText className="text-accent">02</PillText>
                <UiIcon
                  name={progressIcon}
                  className={workflowStatus === "running" ? "h-4 w-4 animate-spin text-accent" : "h-4 w-4 text-accent"}
                />
              </div>
              <BodyText className="mt-1 text-sm font-semibold">
                {t(translation.Console.CreationStep)}
              </BodyText>
            </div>
          </div>
        </div>
      </section>

      {workflowStatus === "error" ? null : (
        <StatusStrip
          environment={environment}
          label={t(translation.Console.CreationStatus)}
          workflowStatus={workflowStatus}
          statusMessage={statusMessage}
        />
      )}

      {starterFailureReason ? <StarterFailureNotice reason={starterFailureReason} /> : null}

      {commandChoicePrompt ? (
        <section
          aria-labelledby="command-choice-title"
          className="rounded-[24px] border border-accent/30 bg-accent/[0.06] p-5 shadow-panel"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent">
              <UiIcon name="chat-question" className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <OverlineText>{t(translation.Console.InputRequired)}</OverlineText>
              <SectionTitle id="command-choice-title" className="mt-1 text-lg">
                {commandChoicePrompt.message}
              </SectionTitle>
              <BodyText tone="muted" className="mt-1 text-sm">
                {t(translation.Console.ChooseOnlyDescription)}
              </BodyText>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={commandChoicePrompt.message}>
            {commandChoicePrompt.options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onChooseCommandOption(commandChoicePrompt.id, option.id)}
                className="rounded-xl border border-accent/30 bg-soft px-4 py-2.5 text-sm font-semibold text-text transition-colors hover:border-accent hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <LogPanel logs={logs} />

      {showSuccessToast ? (
        <Toast
          variant="success"
          title={t(translation.Console.ProjectInitialized)}
          message={statusMessage}
          onClose={() => setShowSuccessToast(false)}
        />
      ) : null}

      {showErrorAlert ? (
        <BaseModal open onClose={() => setShowErrorAlert(false)}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="project-creation-error-title"
            aria-describedby="project-creation-error-message"
            className="w-[420px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-shell border border-error/30 bg-soft shadow-panel"
          >
            <div className="flex items-start gap-3 px-5 pt-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-error/30 bg-error/10 text-error">
                <UiIcon name="warning-triangle" className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <SectionTitle id="project-creation-error-title" className="text-lg">
                  {t(translation.Console.ProjectCreationFailed)}
                </SectionTitle>
                <BodyText
                  id="project-creation-error-message"
                  className="mt-2 break-words text-sm text-muted"
                >
                  {statusMessage}
                </BodyText>
              </div>
            </div>

            <div className="flex justify-end px-5 pb-5 pt-5">
              <button
                type="button"
                autoFocus
                onClick={() => setShowErrorAlert(false)}
                className="rounded-xl bg-error px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                {t(translation.GlobalTerm.Ok)}
              </button>
            </div>
          </div>
        </BaseModal>
      ) : null}
    </div>
  );
}
