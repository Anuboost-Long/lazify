import { useEffect, useMemo, useRef, useState } from "react";

import type {
	GitStatusEntry,
	ImportedProjectIndexNode,
	ImportedProjectIndexResult,
	ProjectGitStatusResult,
} from "@renderer/shared/types/lazify";
import type { EditorTab } from "@renderer/shared/ui/code/EditorTabBar";
import type { SymbolPosition } from "@renderer/shared/ui/code/symbol-at-point";
import type {
	FileContentState,
	ProjectTreeContextMenuState,
} from "@renderer/shared/ui/project-tree/core/types";
import {
	collectDescendantFilePaths,
	findNodeById,
} from "@renderer/shared/ui/project-tree/indexed-tree-utils";
import {
	buildPath,
	renameNodeWithPaths,
	updateNodeTree,
} from "@renderer/shared/ui/project-tree/tree-edits";

import { persistEditorTabs, readStoredEditorTabs } from "./synced-tree/editor-tabs-storage";
import {
	RevealTarget,
	buildAncestorIds,
	findNodeByAbsolutePath,
	findNodeByRelativePath,
} from "./synced-tree/node-lookup";
import { reorderTabs } from "./synced-tree/tab-order";
import { useActiveFileContent } from "./synced-tree/use-active-file-content";

export type { RevealTarget } from "./synced-tree/node-lookup";

export function useSyncedProjectTree({
	allowGitStatus = false,
	editable = false,
	project,
	reveal = null,
}: {
	allowGitStatus?: boolean;
	editable?: boolean;
	project: ImportedProjectIndexResult;
	reveal?: RevealTarget | null;
}) {
	const [activePanel, setActivePanel] = useState<"explorer" | "git">("explorer");
	const [showGitInfo, setShowGitInfo] = useState(false);
	const [editableTree, setEditableTree] = useState<ImportedProjectIndexNode[]>(project.tree);
	const [expandedIds, setExpandedIds] = useState<string[]>(() => []);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
	const [openFiles, setOpenFiles] = useState<EditorTab[]>([]);
	const [, setIncludedFilePaths] = useState<Set<string>>(() => new Set());
	const [fileCache, setFileCache] = useState<Record<string, FileContentState>>({});
	const [contextMenu, setContextMenu] =
		useState<ProjectTreeContextMenuState<ImportedProjectIndexNode> | null>(null);
	const [renamingId, setRenamingId] = useState<string | null>(null);
	const [renameValue, setRenameValue] = useState("");
	const [gitStatus, setGitStatus] = useState<ProjectGitStatusResult | null>(null);
	const [gitStatusLoading, setGitStatusLoading] = useState(false);
	const [gitStatusNonce, setGitStatusNonce] = useState(0);
	const [hydratedProjectPath, setHydratedProjectPath] = useState<string | null>(null);
	const [symbolTarget, setSymbolTarget] = useState<{
		filePath: string;
		line: number;
	} | null>(null);
	const activeRequestIdRef = useRef(0);

	useEffect(() => {
		setActivePanel("explorer");
		setShowGitInfo(false);
		setEditableTree(project.tree);
		setExpandedIds([]);
		setSelectedId(null);

		const stored = readStoredEditorTabs(project.projectPath);
		const restoredTabs = (stored?.openFiles ?? []).filter((tab) =>
			findNodeByAbsolutePath(project.tree, tab.filePath),
		);
		const restoredActive =
			stored?.activeFilePath && restoredTabs.some((tab) => tab.path === stored.activeFilePath)
				? stored.activeFilePath
				: (restoredTabs[0]?.path ?? null);
		setOpenFiles(restoredTabs);
		setActiveFilePath(restoredActive);
		setHydratedProjectPath(project.projectPath);

		setIncludedFilePaths(new Set(project.tree.flatMap((node) => collectDescendantFilePaths(node))));
		setFileCache({});
		setContextMenu(null);
		setRenamingId(null);
		setRenameValue("");
		setGitStatus(null);
		setGitStatusLoading(false);
		setSymbolTarget(null);
	}, [project]);

	useEffect(() => {
		if (hydratedProjectPath !== project.projectPath) {
			return;
		}

		persistEditorTabs(project.projectPath, { openFiles, activeFilePath });
	}, [openFiles, activeFilePath, hydratedProjectPath, project.projectPath]);

	useEffect(() => {
		if (!editable) {
			setContextMenu(null);
			setRenamingId(null);
			setRenameValue("");
		}
	}, [editable]);

	useEffect(() => {
		const closeMenu = () => setContextMenu(null);
		globalThis.addEventListener("click", closeMenu);
		return () => globalThis.removeEventListener("click", closeMenu);
	}, []);

	useEffect(() => {
		if (!allowGitStatus) {
			return;
		}

		let cancelled = false;

		const loadGitStatus = async () => {
			try {
				setGitStatusLoading(true);
				const result = await globalThis.lazify.getProjectGitStatus(project.projectPath);

				if (!cancelled) {
					setGitStatus(result);
				}
			} finally {
				if (!cancelled) {
					setGitStatusLoading(false);
				}
			}
		};

		void loadGitStatus();

		return () => {
			cancelled = true;
		};
	}, [allowGitStatus, project.projectPath, gitStatusNonce]);

	const selectedNode = useMemo(
		() => (selectedId ? findNodeById(editableTree, selectedId) : null),
		[editableTree, selectedId],
	);

	const activeTab = useMemo(
		() => openFiles.find((tab) => tab.path === activeFilePath) ?? null,
		[openFiles, activeFilePath],
	);

	const activeFileNode = useMemo(
		() => (activeTab ? findNodeByAbsolutePath(editableTree, activeTab.filePath) : null),
		[editableTree, activeTab],
	);

	const selectedFileState = activeFilePath
		? (fileCache[activeFilePath] ?? { status: "idle", content: "" })
		: null;

	useActiveFileContent({
		activeFilePath,
		activeTab,
		projectPath: project.projectPath,
		fileCache,
		setFileCache,
		activeRequestIdRef,
	});

	const expandToNode = (nodeId: string) => {
		const ancestorIds = buildAncestorIds(editableTree, nodeId);

		setExpandedIds((current) => {
			const toAdd = ancestorIds.filter((id) => !current.includes(id));
			return toAdd.length > 0 ? [...current, ...toAdd] : current;
		});
	};

	const handleSelectNode = (node: ImportedProjectIndexNode) => {
		setSelectedId(node.id);
		expandToNode(node.id);

		if (node.type !== "file") return;

		setOpenFiles((current) =>
			current.some((tab) => tab.path === node.absolutePath)
				? current
				: [
						...current,
						{
							path: node.absolutePath,
							name: node.name,
							kind: "file" as const,
							filePath: node.absolutePath,
						},
					],
		);
		setActiveFilePath(node.absolutePath);
	};

	const handleOpenDiff = (entry: GitStatusEntry) => {
		const tabPath = `diff:${entry.absolutePath}`;
		const name = entry.path.slice(entry.path.lastIndexOf("/") + 1);

		setOpenFiles((current) =>
			current.some((tab) => tab.path === tabPath)
				? current
				: [...current, { path: tabPath, name, kind: "diff" as const, filePath: entry.absolutePath }],
		);
		setActiveFilePath(tabPath);

		const node = findNodeByAbsolutePath(editableTree, entry.absolutePath);
		if (node) {
			setSelectedId(node.id);
			expandToNode(node.id);
		}
	};

	const handleSelectOpenFile = (path: string) => {
		setActiveFilePath(path);

		const tab = openFiles.find((candidate) => candidate.path === path);
		const node = tab ? findNodeByAbsolutePath(editableTree, tab.filePath) : null;
		if (node) {
			setSelectedId(node.id);
			expandToNode(node.id);
		}
	};

	const handleCloseOpenFile = (path: string) => {
		setOpenFiles((current) => {
			const index = current.findIndex((tab) => tab.path === path);
			if (index === -1) return current;

			const next = current.filter((tab) => tab.path !== path);

			if (path === activeFilePath) {
				const fallback = next[index - 1] ?? next[index] ?? null;
				setActiveFilePath(fallback?.path ?? null);
				if (fallback) {
					const node = findNodeByAbsolutePath(editableTree, fallback.filePath);
					if (node) setSelectedId(node.id);
				}
			}

			return next;
		});
	};

	const handleCloseAllOpenFiles = () => {
		setOpenFiles([]);
		setActiveFilePath(null);
	};

	const handleReorderOpenFiles = (fromPath: string, toPath: string) => {
		setOpenFiles((current) => reorderTabs(current, fromPath, toPath));
	};

	const revealNode = (node: ImportedProjectIndexNode, line: number | null) => {
		const ancestorIds = buildAncestorIds(editableTree, node.id);

		setExpandedIds((current) => {
			const toAdd = ancestorIds.filter((id) => !current.includes(id));
			return toAdd.length > 0 ? [...current, ...toAdd] : current;
		});
		setActivePanel("explorer");
		handleSelectNode(node);
		setSymbolTarget(line ? { filePath: node.absolutePath, line } : null);
	};

	const handleOpenGitEntry = (entry: GitStatusEntry) => {
		const node = findNodeByAbsolutePath(editableTree, entry.absolutePath);

		if (!node) {
			return;
		}

		const ancestorIds = buildAncestorIds(editableTree, node.id);

		setExpandedIds((current) => {
			const toAdd = ancestorIds.filter((id) => !current.includes(id));
			return toAdd.length > 0 ? [...current, ...toAdd] : current;
		});
		setActivePanel("explorer");
		handleSelectNode(node);
	};

	const handleOpenSymbol = async (symbol: string, position?: SymbolPosition) => {
		const hit = await globalThis.lazify
			.findSymbolDefinition(
				project.projectPath,
				symbol,
				activeFileNode?.absolutePath ?? null,
				position,
			)
			.catch(() => null);

		if (!hit) return;

		const node = findNodeByAbsolutePath(editableTree, hit.absolutePath);
		if (!node) return;

		const ancestorIds = buildAncestorIds(editableTree, node.id);

		setExpandedIds((current) => {
			const toAdd = ancestorIds.filter((id) => !current.includes(id));
			return toAdd.length > 0 ? [...current, ...toAdd] : current;
		});
		setActivePanel("explorer");
		handleSelectNode(node);
		setSymbolTarget({ filePath: node.absolutePath, line: hit.line });
	};

	const handleCreateEntry = (type: "file" | "folder") => {
		const parentNode = contextMenu?.node?.type === "folder" ? contextMenu.node : null;
		const seed = Date.now();
		const nextName = type === "file" ? `untitled-${seed}.ts` : `new-folder-${seed}`;
		const nextNode: ImportedProjectIndexNode = {
			id: `workspace-${seed}-${Math.random().toString(16).slice(2, 8)}`,
			name: nextName,
			type,
			relativePath: buildPath(parentNode?.relativePath ?? "", nextName),
			absolutePath: buildPath(parentNode?.absolutePath ?? project.projectPath, nextName),
			children: [],
		};

		setEditableTree((current) => {
			if (!parentNode) {
				return [...current, nextNode];
			}

			return updateNodeTree(current, parentNode.id, (node) => ({
				...node,
				children: [...node.children, nextNode],
			}));
		});

		if (parentNode) {
			setExpandedIds((current) =>
				current.includes(parentNode.id) ? current : [...current, parentNode.id],
			);
		}

		if (type === "file") {
			setFileCache((current) => ({
				...current,
				[nextNode.absolutePath]: {
					status: "loaded",
					content: "",
				},
			}));
			setActiveFilePath(nextNode.absolutePath);
		} else {
			setActiveFilePath(null);
		}

		setSelectedId(nextNode.id);
		setRenamingId(nextNode.id);
		setRenameValue(nextName);
		setContextMenu(null);
	};

	const handleDeleteNode = () => {
		const targetNode = contextMenu?.node;

		if (!targetNode) {
			return;
		}

		setEditableTree((current) => updateNodeTree(current, targetNode.id, () => null));
		setIncludedFilePaths((current) => {
			const next = new Set(current);
			collectDescendantFilePaths(targetNode).forEach((filePath) => next.delete(filePath));
			return next;
		});

		if (selectedId === targetNode.id) {
			setSelectedId(null);
			setActiveFilePath(null);
		}

		setContextMenu(null);
	};

	const handleRevealInFinder = () => {
		const targetNode = contextMenu?.node;

		if (!targetNode) {
			return;
		}

		void globalThis.lazify.revealInFileManager(targetNode.absolutePath);
		setContextMenu(null);
	};

	const handleStartRename = () => {
		const targetNode = contextMenu?.node;

		if (!targetNode) {
			return;
		}

		setSelectedId(targetNode.id);
		setRenamingId(targetNode.id);
		setRenameValue(targetNode.name);
		setContextMenu(null);
	};

	const handleCommitRename = () => {
		if (!renamingId) {
			return;
		}

		const nextName = renameValue.trim();

		if (!nextName) {
			setRenamingId(null);
			setRenameValue("");
			return;
		}

		setEditableTree((current) =>
			updateNodeTree(current, renamingId, (node) => renameNodeWithPaths(node, nextName)),
		);
		setRenamingId(null);
		setRenameValue("");
	};

	useEffect(() => {
		if (!reveal || editableTree.length === 0) return;

		const node = findNodeByRelativePath(editableTree, reveal.filePath);
		if (node) revealNode(node, reveal.line);
	}, [reveal?.filePath, reveal?.line, editableTree]);

	const handleToggleExpand = (nodeId: string) => {
		setExpandedIds((current) =>
			current.includes(nodeId) ? current.filter((id) => id !== nodeId) : [...current, nodeId],
		);
	};

	return {
		activeFileNode,
		activeFilePath,
		activeTab,
		activePanel,
		handleCloseAllOpenFiles,
		handleCloseOpenFile,
		handleReorderOpenFiles,
		handleSelectOpenFile,
		openFiles,
		contextMenu,
		editableTree,
		expandedIds,
		gitStatus,
		gitStatusLoading,
		refreshGitStatus: () => setGitStatusNonce((current) => current + 1),
		handleCommitRename,
		handleCreateEntry,
		handleDeleteNode,
		handleOpenDiff,
		handleOpenGitEntry,
		handleOpenSymbol,
		focusLine:
			symbolTarget && activeTab?.kind === "file" && activeTab.filePath === symbolTarget.filePath
				? symbolTarget.line
				: null,
		handleRevealInFinder,
		handleSelectNode,
		handleStartRename,
		handleToggleExpand,
		renameValue,
		renamingId,
		selectedFileState,
		selectedId,
		selectedNode,
		setActivePanel,
		setContextMenu,
		setExpandedIds,
		setRenameValue,
		setRenamingId,
		setShowGitInfo,
		showGitInfo,
	};
}
