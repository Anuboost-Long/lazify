import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import { CaptionText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { ProjectPickerPanel } from "@renderer/shared/ui/project-picker/ProjectPickerPanel";

import { SetupChoiceRow } from "./SetupChoiceRow";
import { SetupScriptChoices } from "./SetupScriptChoices";

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
	onPickScript,
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
					<CaptionText tone="muted" className="mb-1 block px-6">
						{t(translation.Agents.MonitorChooseProjectDesc)}
					</CaptionText>

					<ProjectPickerPanel
						projects={projects}
						selectedPath={project?.projectPath}
						inset
						onSelect={onPickProject}
					/>
				</>
			) : null}

			{stage === "source" && project ? (
				<>
					<CaptionText tone="muted" className="mb-1 block px-6">
						{t(translation.Agents.MonitorChooseSourceDesc, { project: project.projectName })}
					</CaptionText>

					<div className="flex flex-col gap-2 px-6">
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
					</div>
				</>
			) : null}

			{stage === "script" && project ? (
				<>
					<CaptionText tone="muted" className="mb-1 block px-6">
						{t(translation.Agents.MonitorChooseScriptDesc)}
					</CaptionText>

					<SetupScriptChoices
						scripts={scripts}
						visibleScripts={visibleScripts}
						onPickScript={onPickScript}
					/>
				</>
			) : null}

			{noMatches ? (
				<div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
					<UiIcon name="search" className="h-5 w-5 text-muted/50" />
					<CaptionText tone="muted">
						{t(translation.Agents.MonitorNoMatches, { query: query.trim() })}
					</CaptionText>
				</div>
			) : null}
		</>
	);
}
