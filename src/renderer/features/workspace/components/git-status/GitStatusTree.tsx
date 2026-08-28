import clsx from "clsx";
import { useMemo, useState } from "react";

import type { GitStatusEntry } from "@renderer/shared/types/lazify";
import { MonoText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { ROW_HEIGHT } from "@renderer/shared/ui/project-tree/core/project-tree-visuals";
import { Tooltip } from "@renderer/shared/ui/Tooltip";

import { buildGitTree, type GitTreeNode } from "./git-tree";
import { GitStatusRow } from "./GitStatusRow";

interface GitStatusTreeProps {
	entries: GitStatusEntry[];
	selectedPath: string | null;
	group: "staged" | "unstaged";
	onSelect: (entry: GitStatusEntry) => void;
	onStage: (entry: GitStatusEntry) => void;
	onUnstage: (entry: GitStatusEntry) => void;
	onDiscard: (entry: GitStatusEntry) => void;
}

export function GitStatusTree({
	entries,
	selectedPath,
	group,
	onSelect,
	onStage,
	onUnstage,
	onDiscard,
}: Readonly<GitStatusTreeProps>) {
	const tree = useMemo(() => buildGitTree(entries), [entries]);
	const [collapsedIds, setCollapsedIds] = useState<string[]>([]);

	const collapsed = useMemo(() => new Set(collapsedIds), [collapsedIds]);

	const toggle = (id: string) =>
		setCollapsedIds((current) =>
			current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
		);

	const renderNodes = (nodes: GitTreeNode[], depth: number): React.ReactNode =>
		nodes.map((node) => {
			if (node.type === "file" && node.entry) {
				return (
					<GitStatusRow
						key={node.id}
						entry={node.entry}
						name={node.name}
						depth={depth}
						selected={selectedPath === node.entry.absolutePath}
						group={group}
						onSelect={onSelect}
						onStage={onStage}
						onUnstage={onUnstage}
						onDiscard={onDiscard}
					/>
				);
			}

			const isCollapsed = collapsed.has(node.id);

			return (
				<div key={node.id}>
					<Tooltip content={node.id} side="top">
						<button
							type="button"
							onClick={() => toggle(node.id)}
							style={{ height: ROW_HEIGHT, paddingLeft: `${12 + depth * 18}px` }}
							className={clsx(
								"flex w-full items-center gap-2 rounded-xl pr-2 text-left transition-colors duration-100",
								"text-text/80 hover:bg-accent/[0.06] hover:text-text",
							)}
						>
							<span className="w-3 shrink-0 text-center text-[10px] text-muted/60">
								{isCollapsed ? "▸" : "▾"}
							</span>
							<UiIcon name="folder" className="h-4 w-4 shrink-0 text-accent" />
							<MonoText as="span" className="min-w-0 flex-1 truncate text-sm">
								{node.name}
							</MonoText>
						</button>
					</Tooltip>

					{isCollapsed ? null : renderNodes(node.children, depth + 1)}
				</div>
			);
		});

	return <div className="flex flex-col">{renderNodes(tree, 0)}</div>;
}

export { collectFolderIds } from "./git-tree";
