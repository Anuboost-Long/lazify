import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import { OverlineText, SectionTitle } from "@renderer/shared/typography";
import { TextInput } from "@renderer/shared/ui/form/FormInput";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";
import { SetupStageBody, type SetupStage } from "./monitor/SetupStageBody";
import { SetupSteps } from "./monitor/SetupSteps";

interface AgentMonitorSetupModalProps {
  open: boolean;
  projects: SyncedWorkspaceProject[];
  onClose: () => void;

  onPickScript: (project: SyncedWorkspaceProject, scriptName: string) => void;

  onPickAgentRoute: (project: SyncedWorkspaceProject) => void;
}

const STAGE_INDEX: Record<SetupStage, number> = { project: 0, source: 1, script: 2 };

const SEARCH_THRESHOLD = 5;

function matches(query: string, ...fields: string[]) {
  const needle = query.trim().toLowerCase();

  return needle.length === 0 || fields.some((field) => field.toLowerCase().includes(needle));
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
  const [query, setQuery] = useState("");

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

  useEffect(() => setQuery(""), [stage]);

  const reset = () => {
    setStage("project");
    setProject(null);
    setScripts(null);
    setQuery("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const title =
    stage === "project"
      ? t(translation.Agents.MonitorChooseProject)
      : stage === "source"
        ? t(translation.Agents.MonitorChooseSource)
        : t(translation.Agents.MonitorChooseScript);

  const visibleProjects = useMemo(
    () =>
      projects.filter((candidate) =>
        matches(query, candidate.projectName, candidate.projectPath)
      ),
    [projects, query]
  );

  const visibleScripts = useMemo(
    () =>
      Object.entries(scripts ?? {}).filter(([name, command]) => matches(query, name, command)),
    [scripts, query]
  );

  const searchable =
    (stage === "project" && projects.length >= SEARCH_THRESHOLD) ||
    (stage === "script" && Object.keys(scripts ?? {}).length >= SEARCH_THRESHOLD);

  return (
    <BaseModal open={open} onClose={handleClose}>
      <div
        className={clsx(
          "flex max-h-[min(44rem,88vh)] w-[760px] max-w-[calc(100vw-2rem)] flex-col",
          "overflow-hidden rounded-shell border border-border bg-soft shadow-panel"
        )}
      >
        <header className="shrink-0 border-b border-border px-6 pb-4 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              {stage === "project" ? null : (
                <button
                  type="button"
                  onClick={() => setStage(stage === "script" ? "source" : "project")}
                  aria-label={t(translation.GlobalTerm.Back)}
                  className={clsx(
                    "mt-0.5 shrink-0 rounded-xl border border-border bg-bg p-2",
                    "text-muted transition-colors duration-150 hover:border-accent/30 hover:text-text"
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
                "shrink-0 rounded-xl border border-border bg-bg p-2",
                "text-muted transition-colors duration-150 hover:border-accent/30 hover:text-text"
              )}
            >
              <UiIcon name="xmark" className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4">
            <SetupSteps
              current={STAGE_INDEX[stage]}
              steps={[
                t(translation.Agents.MonitorStepProject),
                t(translation.Agents.MonitorStepSource),
                t(translation.Agents.MonitorStepScript),
              ]}
            />
          </div>

          {searchable ? (
            <TextInput
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              icon="search"
              size="sm"
              spellCheck={false}
              placeholder={t(
                stage === "project"
                  ? translation.Agents.MonitorSearchProjects
                  : translation.Agents.MonitorSearchScripts
              )}
              className="mt-4"
            />
          ) : null}
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-6 py-5">
          <SetupStageBody
            stage={stage}
            projects={visibleProjects}
            project={project}
            scripts={scripts}
            visibleScripts={visibleScripts}
            query={query}
            onPickProject={(candidate) => {
              setProject(candidate);
              setStage("source");
            }}
            onPickAgentRoute={() => {
              if (!project) return;
              onPickAgentRoute(project);
            }}
            onPickScriptRoute={() => setStage("script")}
            onPickScript={(name) => {
              if (!project) return;
              reset();
              onPickScript(project, name);
            }}
          />
        </div>
      </div>
    </BaseModal>
  );
}
