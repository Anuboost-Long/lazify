import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { gapKey } from "@main/api-studio/docs/gap-key";
import type { CollectionDoc } from "@main/api-studio/docs/types";
import { AgentPickerModal } from "@renderer/features/agents/components/agent-picker";
import { useAgentTerminals } from "@renderer/features/agents/hooks/agent-terminals";
import { translation } from "@renderer/i18n/translation";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";

import type { CustomCollection } from "../../custom-collection";
import { DOCUMENT_SELECTION, type DocSelection } from "../../doc-selection";
import { useCollectionDoc } from "../../hooks/use-collection-doc";
import { useDocAgent } from "../../hooks/use-doc-agent";
import { DocAgentPanel } from "./DocAgentPanel";
import { DocAgentRun } from "./DocAgentRun";
import { DocBuilderHeader, type DocTab } from "./DocBuilderHeader";
import { DocDesignPanel } from "./DocDesignPanel";
import { DocOutline } from "./DocOutline";
import { DocPreviewPane } from "./DocPreviewPane";
import { DocSectionForm } from "./DocSectionForm";

interface DocBuilderModalProps {
	open: boolean;
	projectPath: string;
	collection: CustomCollection | null;
	onClose: () => void;
}

export function DocBuilderModal({
	open,
	projectPath,
	collection,
	onClose,
}: Readonly<DocBuilderModalProps>) {
	return (
		<BaseModal open={open} onClose={onClose}>
			{open && collection ? (
				<DocBuilderCard projectPath={projectPath} collection={collection} onClose={onClose} />
			) : null}
		</BaseModal>
	);
}

interface DocBuilderCardProps {
	projectPath: string;
	collection: CustomCollection;
	onClose: () => void;
}

function DocBuilderCard({ projectPath, collection, onClose }: Readonly<DocBuilderCardProps>) {
	const { t } = useTranslation();
	const [tab, setTab] = useState<DocTab>("write");
	const [selected, setSelected] = useState<DocSelection>(DOCUMENT_SELECTION);
	const [sent, setSent] = useState(false);
	const [answered, setAnswered] = useState<ReadonlySet<string>>(new Set());
	const agent = useDocAgent(projectPath);
	const { availableAgents, createAgent, deleteAgent } = useAgentTerminals(projectPath);
	const { doc, gaps, loading, saving, savedAt, update, saveNow, reload } = useCollectionDoc(
		projectPath,
		collection.id,
	);
	const ask = (keys: string[]) => {
		if (keys.length === 0) return;

		saveNow();

		void globalThis.lazify
			.collectionDocQuestions(projectPath, collection.id, keys)
			.then((prompt) => {
				if (!prompt) return;

				agent.ask(prompt);
				setSent(true);
			})
			.catch(() => undefined);
	};

	const showTab = (next: DocTab) => {
		if (next !== "write") saveNow();

		setTab(next);
	};

	const panel = (current: CollectionDoc) => {
		switch (tab) {
			case "write":
				return (
					<div className="flex min-h-0 flex-1">
						<div className="w-[16rem] shrink-0 border-r border-border">
							<DocOutline
								doc={current}
								gaps={gaps}
								collection={collection}
								selected={selected}
								onSelect={setSelected}
							/>
						</div>

						<div className="min-h-0 flex-1 overflow-y-auto">
							<DocSectionForm
								doc={current}
								gaps={gaps}
								collection={collection}
								selected={selected}
								answered={answered}
								onAsk={(key) => ask([key])}
								onChange={update}
							/>
						</div>
					</div>
				);
			case "agent":
				return (
					<DocAgentPanel
						projectPath={projectPath}
						doc={current}
						refreshKey={savedAt}
						onChange={update}
						onImported={reload}
					/>
				);
			case "design":
				return (
					<div className="min-h-0 flex-1 overflow-y-auto">
						<DocDesignPanel doc={current} onChange={update} />
					</div>
				);
			default:
				return (
					<DocPreviewPane
						projectPath={projectPath}
						collectionId={collection.id}
						title={current.title || collection.name}
						refreshKey={savedAt}
					/>
				);
		}
	};

	return (
		<div
			className={clsx(
				"flex h-[88vh] w-[min(1180px,96vw)] flex-col overflow-hidden",
				"rounded-2xl border border-border bg-bg shadow-2xl",
			)}
		>
			<DocBuilderHeader
				collectionName={collection.name}
				tab={tab}
				saving={saving}
				sent={sent}
				openQuestions={gaps.length}
				onShowTab={showTab}
				onAskAll={() => ask(gaps.map(gapKey))}
				onClose={() => {
					saveNow();
					agent.stop();
					onClose();
				}}
			/>

			{!doc ? (
				<p className="p-6 text-xs text-muted">
					{loading ? t(translation.ApiStudio.Scanning) : t(translation.ApiStudio.DocNoRoutes)}
				</p>
			) : (
				<div className="flex min-h-0 flex-1">
					<div className="flex min-h-0 min-w-0 flex-1 flex-col">{panel(doc)}</div>

					{agent.runId ? (
						<DocAgentRun
							runId={agent.runId}
							projectPath={projectPath}
							collectionId={collection.id}
							prompt={agent.pending}
							onSent={agent.sent}
							onAnswered={(_filled, keys) => {
								setSent(false);
								setAnswered(new Set(keys));
								reload();
							}}
							onClose={agent.stop}
						/>
					) : null}
				</div>
			)}

			<AgentPickerModal
				open={agent.picking}
				agents={availableAgents}
				projectPath={projectPath}
				onSelect={(agentId, resumeSessionId) => void agent.start(agentId, resumeSessionId)}
				onClose={agent.cancelPicking}
				onCreate={createAgent}
				onDelete={deleteAgent}
			/>
		</div>
	);
}
