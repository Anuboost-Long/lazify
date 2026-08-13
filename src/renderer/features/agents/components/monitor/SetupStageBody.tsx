import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import { CaptionText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { SetupChoiceRow } from "./SetupChoiceRow";

export type SetupStage = "project" | "source" | "script";

interface SetupStageBodyProps {
  stage: SetupStage;
  projects: SyncedWorkspaceProject[];
  project: SyncedWorkspaceProject | null;
  scripts: Record<string, string> | null;
  visibleScripts: [string, string][];
  query: string;
  onPickProject: (project: SyncedWorkspaceProject) => void;
  onPickAgentRoute: () => void;
  onPickScriptRoute: () => void;
  onPickScript: (scriptName: string) => void;
}

export function SetupStageBody({
  stage,
  projects,
  project,
  scripts,
  visibleScripts,
  query,
  onPickProject,
  onPickAgentRoute,
  onPickScriptRoute,
  onPickScript
}: Readonly<SetupStageBodyProps>) {
  const { t } = useTranslation();

  const searching = query.trim().length > 0;
  const noMatches =
    searching &&
    ((stage === "project" && projects.length === 0) ||
      (stage === "script" && scripts !== null && visibleScripts.length === 0));

  return (
    <>
      {stage === "project" ? (
        <>
          <CaptionText tone="muted" className="mb-1 block">
            {t(translation.Agents.MonitorChooseProjectDesc)}
          </CaptionText>

          {projects.map((candidate) => (
            <SetupChoiceRow
              key={candidate.projectPath}
              initial={candidate.projectName.slice(0, 1)}
              title={candidate.projectName}
              subtitle={candidate.projectPath}
              mono
              onClick={() => onPickProject(candidate)}
            />
          ))}
        </>
      ) : null}

      {stage === "source" && project ? (
        <>
          <CaptionText tone="muted" className="mb-1 block">
            {t(translation.Agents.MonitorChooseSourceDesc, { project: project.projectName })}
          </CaptionText>

          <SetupChoiceRow
            icon="terminal"
            emphasis
            title={t(translation.Agents.MonitorSourceAgent)}
            subtitle={t(translation.Agents.MonitorSourceAgentDesc)}
            onClick={onPickAgentRoute}
          />

          <SetupChoiceRow
            icon="play"
            title={t(translation.Agents.MonitorSourceScript)}
            subtitle={t(translation.Agents.MonitorSourceScriptDesc)}
            onClick={onPickScriptRoute}
          />
        </>
      ) : null}

      {stage === "script" && project ? (
        <>
          <CaptionText tone="muted" className="mb-1 block">
            {t(translation.Agents.MonitorChooseScriptDesc)}
          </CaptionText>

          {scripts === null ? (
            <CaptionText tone="muted">{t(translation.GlobalTerm.Loading)}</CaptionText>
          ) : Object.keys(scripts).length === 0 ? (
            <CaptionText tone="muted">{t(translation.Agents.MonitorNoScripts)}</CaptionText>
          ) : (
            visibleScripts.map(([name, command]) => (
              <SetupChoiceRow
                key={name}
                icon="play"
                title={name}
                subtitle={command}
                mono
                onClick={() => onPickScript(name)}
              />
            ))
          )}
        </>
      ) : null}

      {noMatches ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <UiIcon name="search" className="h-5 w-5 text-muted/50" />
          <CaptionText tone="muted">
            {t(translation.Agents.MonitorNoMatches, { query: query.trim() })}
          </CaptionText>
        </div>
      ) : null}
    </>
  );
}
