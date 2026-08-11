import clsx from "clsx";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import {
  BodyText,
  CaptionText,
  MonoText,
  OverlineText,
  SectionTitle,
} from "@renderer/shared/typography";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";

type SetupStage = "project" | "source" | "script";

interface AgentMonitorSetupModalProps {
  open: boolean;
  projects: SyncedWorkspaceProject[];
  onClose: () => void;

  onPickScript: (project: SyncedWorkspaceProject, scriptName: string) => void;

  onPickAgentRoute: (project: SyncedWorkspaceProject) => void;
}

interface ChoiceRowProps {
  icon: UiIconName;
  title: string;
  subtitle: string;

  mono?: boolean;
  onClick: () => void;
}

function ChoiceRow({ icon, title, subtitle, mono = false, onClick }: Readonly<ChoiceRowProps>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left",
        "border-border bg-bg transition-colors duration-150",
        "hover:border-accent/50 hover:bg-accent/[0.06]"
      )}
    >
      <div
        className={clsx(
          "flex h-9 w-9 shrink-0 items-center justify-center",
          "rounded-xl border border-border bg-soft text-muted"
        )}
      >
        <UiIcon name={icon} className="h-[18px] w-[18px]" />
      </div>

      <div className="min-w-0 flex-1">
        <BodyText className="truncate">{title}</BodyText>
        {mono ? (
          <MonoText as="span" className="mt-0.5 block truncate text-[10px] text-muted">
            {subtitle}
          </MonoText>
        ) : (
          <CaptionText tone="muted" className="truncate">
            {subtitle}
          </CaptionText>
        )}
      </div>

      <UiIcon name="arrow-right" className="h-4 w-4 shrink-0 text-muted" />
    </button>
  );
}

export function AgentMonitorSetupModal({
  open,
  projects,
  onClose,
  onPickScript,
  onPickAgentRoute,
}: Readonly<AgentMonitorSetupModalProps>) {
  const { t } = useTranslation();
  const [stage, setStage] = useState<SetupStage>("project");
  const [project, setProject] = useState<SyncedWorkspaceProject | null>(null);

  const [scripts, setScripts] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    if (!open || stage !== "script" || !project) return;

    let cancelled = false;
    setScripts(null);

    void globalThis.lazify.listScripts(project.projectPath).then((result) => {
      if (!cancelled) setScripts(result);
    });

    return () => {
      cancelled = true;
    };
  }, [open, stage, project]);

  const reset = () => {
    setStage("project");
    setProject(null);
    setScripts(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleBack = () => setStage(stage === "script" ? "source" : "project");

  const title =
    stage === "project"
      ? t(translation.Agents.MonitorChooseProject)
      : stage === "source"
        ? t(translation.Agents.MonitorChooseSource)
        : t(translation.Agents.MonitorChooseScript);

  const scriptNames = Object.keys(scripts ?? {});

  return (
    <BaseModal open={open} onClose={handleClose}>
      <div
        className={clsx(
          "w-[480px] max-w-[calc(100vw-2rem)] overflow-hidden",
          "rounded-shell border border-border bg-soft shadow-panel"
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            {stage === "project" ? null : (
              <button
                type="button"
                onClick={handleBack}
                aria-label={t(translation.GlobalTerm.Back)}
                className={clsx(
                  "rounded-xl border border-border bg-bg p-2 transition-colors duration-150",
                  "text-muted hover:border-accent/30 hover:text-text"
                )}
              >
                <UiIcon name="arrow-left" className="h-4 w-4" />
              </button>
            )}

            <div className="min-w-0">
              <OverlineText className="text-muted">
                {t(translation.Agents.LiveMonitor)}
              </OverlineText>
              <SectionTitle className="mt-1 truncate text-2xl">{title}</SectionTitle>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label={t(translation.GlobalTerm.Close)}
            className={clsx(
              "shrink-0 rounded-xl border border-border bg-bg p-2 transition-colors duration-150",
              "text-muted hover:border-accent/30 hover:text-text"
            )}
          >
            <UiIcon name="xmark" className="h-4 w-4" />
          </button>
        </div>

        <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto px-6 py-5">
          {stage === "project" ? (
            <>
              <CaptionText tone="muted">
                {t(translation.Agents.MonitorChooseProjectDesc)}
              </CaptionText>

              {projects.map((candidate) => (
                <ChoiceRow
                  key={candidate.projectPath}
                  icon="folder"
                  title={candidate.projectName}
                  subtitle={candidate.projectPath}
                  mono
                  onClick={() => {
                    setProject(candidate);
                    setStage("source");
                  }}
                />
              ))}
            </>
          ) : null}

          {stage === "source" && project ? (
            <>
              <CaptionText tone="muted">
                {t(translation.Agents.MonitorChooseSourceDesc, {
                  project: project.projectName,
                })}
              </CaptionText>

              <ChoiceRow
                icon="terminal"
                title={t(translation.Agents.MonitorSourceAgent)}
                subtitle={t(translation.Agents.MonitorSourceAgentDesc)}
                onClick={() => {
                  reset();
                  onPickAgentRoute(project);
                }}
              />

              <ChoiceRow
                icon="play"
                title={t(translation.Agents.MonitorSourceScript)}
                subtitle={t(translation.Agents.MonitorSourceScriptDesc)}
                onClick={() => setStage("script")}
              />
            </>
          ) : null}

          {stage === "script" && project ? (
            <>
              <CaptionText tone="muted">
                {t(translation.Agents.MonitorChooseScriptDesc)}
              </CaptionText>

              {scripts === null ? (
                <CaptionText tone="muted">{t(translation.GlobalTerm.Loading)}</CaptionText>
              ) : scriptNames.length === 0 ? (
                <CaptionText tone="muted">{t(translation.Agents.MonitorNoScripts)}</CaptionText>
              ) : (
                scriptNames.map((name) => (
                  <ChoiceRow
                    key={name}
                    icon="play"
                    title={name}
                    subtitle={scripts[name]}
                    mono
                    onClick={() => {
                      reset();
                      onPickScript(project, name);
                    }}
                  />
                ))
              )}
            </>
          ) : null}
        </div>
      </div>
    </BaseModal>
  );
}
