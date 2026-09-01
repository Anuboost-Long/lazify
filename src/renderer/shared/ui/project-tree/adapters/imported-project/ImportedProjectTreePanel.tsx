import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { BodyText } from "@renderer/shared/typography";
import { SelectInput, TextInput } from "@renderer/shared/ui/form/FormInput";
import { ProjectTreeEditor } from "@renderer/shared/ui/project-tree/core/ProjectTreeEditor";
import { ProjectTreeEditorPanel } from "@renderer/shared/ui/project-tree/core/ProjectTreeEditorPanel";
import { findNodeById } from "@renderer/shared/ui/project-tree/indexed-tree-utils";
import { TreeContextMenu } from "@renderer/shared/ui/project-tree/TreeContextMenu";
import { Tooltip } from "@renderer/shared/ui/Tooltip";

import type { ImportedProjectTreePanelProps } from "./types";
import { useImportedProjectTree } from "./useImportedProjectTree";

export function ImportedProjectTreePanel({
	editable = false,
	initialConfirmedStack,
	onSaveTemplate,
	projectName,
	projectPath,
	tree,
}: Readonly<ImportedProjectTreePanelProps>) {
	const { t } = useTranslation();
	const adapter = useImportedProjectTree({
		initialConfirmedStack,
		onSaveTemplate,
		projectPath,
		tree,
	});
	const saveDisabledReason = adapter.confirmedStack
		? null
		: t(translation.ProjectTree.SelectStackWarning);

	return (
		<ProjectTreeEditorPanel
			mode={editable ? "editable" : "readonly"}
			projectName={projectName}
			projectPath={projectPath}
			tree={adapter.editableTree}
			expandedIds={adapter.expandedIds}
			selectedId={adapter.selectedId}
			renamingId={adapter.renamingId}
			renameValue={adapter.renameValue}
			isChecked={adapter.handleIsChecked}
			onToggleChecked={adapter.handleToggleChecked}
			onSelect={(id) => {
				const node = findNodeById(adapter.editableTree, id);
				if (node) adapter.handleSelectNode(node);
			}}
			onToggleExpand={adapter.handleToggleExpand}
			onCollapseAll={() => adapter.setExpandedIds([])}
			onCreateEntry={editable ? adapter.handleCreateEntry : undefined}
			onOpenContextMenu={
				editable
					? (event, nodeId) => {
							const node = findNodeById(adapter.editableTree, nodeId);

							if (node) {
								const row = event.currentTarget.getBoundingClientRect();

								adapter.setContextMenu({ node, x: row.left, y: row.bottom + 4 });
							}
						}
					: undefined
			}
			onRenameValueChange={adapter.setRenameValue}
			onCommitRename={adapter.handleCommitRename}
			onCancelRename={() => {
				adapter.setRenamingId(null);
				adapter.setRenameValue("");
			}}
			headerAccessory={
				<>
					<div className="rounded-full border border-emerald-300/30 bg-emerald-100/70 px-3 py-1 text-xs font-semibold text-emerald-900">
						{t(translation.ProjectTree.FilesSelected, {
							selected: adapter.includedFilePaths.size,
							total: adapter.totalFileCount,
						})}
					</div>
					<SelectInput
						value={adapter.confirmedStack}
						onChange={(event) => adapter.setConfirmedStack(event.target.value)}
						icon="code"
						className="w-full max-w-[22rem] min-w-0"
					>
						<option value="">{t(translation.ProjectTree.SelectStackFirst)}</option>
						<option value="react-vite">React Vite</option>
						<option value="react-next">React Next.js</option>
						<option value="react-cra">React CRA</option>
						<option value="react-unknown">React Other</option>
						<option value="react-native-expo">React Native Expo</option>
						<option value="react-native-cli">React Native CLI</option>
						<option value="node-api">Node API</option>
						<option value="electron">Electron</option>
						<option value="unknown">Unknown / Other</option>
					</SelectInput>
					<TextInput
						value={adapter.templateName}
						onChange={(event) => adapter.setTemplateName(event.target.value)}
						placeholder={t(translation.ProjectTree.TemplateNamePlaceholder)}
						icon="package"
						className="w-full max-w-[22rem] min-w-0"
					/>
					<Tooltip content={saveDisabledReason ?? undefined} side="top">
						<button
							type="button"
							disabled={
								adapter.saveBusy || adapter.includedFilePaths.size === 0 || !adapter.confirmedStack
							}
							onClick={() => void adapter.handleSaveTemplate()}
							className="inline-flex items-center justify-center rounded-[16px] border border-transparent bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accentHover disabled:cursor-not-allowed disabled:opacity-60"
						>
							{adapter.saveBusy
								? t(translation.ProjectTree.SavingTemplate)
								: t(translation.ProjectTree.SaveAsTemplate)}
						</button>
					</Tooltip>
					{saveDisabledReason ? (
						<BodyText className="max-w-[22rem] text-xs text-amber-800">{saveDisabledReason}</BodyText>
					) : null}
				</>
			}
			editor={
				<ProjectTreeEditor
					selectedNode={adapter.selectedNode}
					selectedFileState={adapter.selectedFileState}
				/>
			}
			contextMenu={
				editable ? (
					<TreeContextMenu
						position={adapter.contextMenu}
						onNewFile={() => adapter.handleCreateEntry("file")}
						onNewFolder={() => adapter.handleCreateEntry("folder")}
						onRename={adapter.handleStartRename}
						onDelete={adapter.handleDeleteNode}
					/>
				) : null
			}
		/>
	);
}
