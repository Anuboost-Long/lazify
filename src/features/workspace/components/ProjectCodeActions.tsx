import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { getAgentsRoute } from "@/app/app-routes";
import {
	SendToAgentDialog,
	type AgentPayload,
} from "@/features/agents/components/send-to-agent";
import {
	useAgentTerminals,
	useRevealAgentRun,
} from "@/features/agents/hooks/agent-terminals";
import { buildFindingsPayload } from "@/features/agents/utils/diagnostic-payload";
import { translation } from "@/i18n/translation";
import { useInterfaceSettings } from "@/shared/hooks/use-interface-settings";
import {
	CodeQualityActionsProvider,
	type CodeQualityActions,
} from "@/shared/ui/code/diagnostics/quality-actions";
import type {
	CodeSelectionAction,
	CodeSelectionContext,
} from "@/shared/ui/code/menu/code-selection";
import { CodeSelectionActionsProvider } from "@/shared/ui/code/menu/selection-actions";
import { ProjectAgentActionsProvider } from "@/shared/ui/project-tree/ProjectAgentActions";
import { Toast } from "@/shared/ui/toast/Toast";

interface ProjectCodeActionsProps {
	projectPath: string;
	children: ReactNode;
}

export function ProjectCodeActions({ projectPath, children }: Readonly<ProjectCodeActionsProps>) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [selection, setSelection] = useState<CodeSelectionContext | null>(null);
	const [filePath, setFilePath] = useState<string | null>(null);
	const [payload, setPayload] = useState<AgentPayload | null>(null);
	/** The task just written down, named so the toast can say what it was. */
	const [createdTask, setCreatedTask] = useState<string | null>(null);
	const { openAgentAfterSend } = useInterfaceSettings();
	const { availableAgents, openTerminal, createAgent, deleteAgent } = useAgentTerminals(projectPath);
	const revealAgentRun = useRevealAgentRun();

	const actions = useMemo<CodeSelectionAction[]>(
		() => [
			{
				id: "send-to-agent",
				label: t(translation.Agents.SendSelectionToAgent),
				icon: "chat-question",
				onSelect: (nextSelection) => {
					setFilePath(null);
					setPayload(null);
					setSelection(nextSelection);
				},
			},
		],
		[t],
	);

	const qualityActions: CodeQualityActions = {
		fix: (findings) => {
			setSelection(null);
			setFilePath(null);
			setPayload(buildFindingsPayload(findings, projectPath));
		},
		createTask: (findings) => {
			void globalThis.lazify
				.createFixTask({ projectPath, findings })
				.then((task) => setCreatedTask(task?.name ?? null));
		},
	};

	return (
		<CodeSelectionActionsProvider actions={actions}>
			<CodeQualityActionsProvider actions={qualityActions}>
				<ProjectAgentActionsProvider
					onSendFileToAgent={(nextFilePath) => {
						setSelection(null);
						setPayload(null);
						setFilePath(nextFilePath);
					}}
				>
					{children}
				</ProjectAgentActionsProvider>
			</CodeQualityActionsProvider>

			<SendToAgentDialog
				selection={selection}
				filePath={filePath}
				payload={payload}
				projectPath={projectPath}
				agents={availableAgents}
				onStartAgent={openTerminal}
				onCreateAgent={createAgent}
				onDeleteAgent={deleteAgent}
				onSent={(runId) => {
					revealAgentRun(runId);
					if (openAgentAfterSend) navigate(getAgentsRoute(projectPath));
				}}
				onClose={() => {
					setSelection(null);
					setFilePath(null);
					setPayload(null);
				}}
			/>

			{createdTask ? (
				<Toast
					title={t(translation.CodeQuality.TaskCreated)}
					message={createdTask}
					onClose={() => setCreatedTask(null)}
				/>
			) : null}
		</CodeSelectionActionsProvider>
	);
}
