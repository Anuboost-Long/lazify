import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { PillText } from "@renderer/shared/typography";

interface TreeContextMenuProps {
	position: { x: number; y: number } | null;
	onNewFile?: () => void;
	onNewFolder?: () => void;
	onSendToAgent?: () => void;
	onRename?: () => void;
	onDelete?: () => void;
	onRevealInFinder?: () => void;
}

interface TreeContextMenuItem {
	key: string;
	label: string;
	hint?: string;
	onClick: () => void;
}

const MENU_WIDTH = 168;
const ROW_HEIGHT = 40;
const MENU_PADDING = 16;

export function TreeContextMenu({
	position,
	onNewFile,
	onNewFolder,
	onSendToAgent,
	onRename,
	onDelete,
	onRevealInFinder,
}: Readonly<TreeContextMenuProps>) {
	const { t } = useTranslation();

	if (!position) return null;

	const menuItems: TreeContextMenuItem[] = [];

	if (onNewFile) {
		menuItems.push({
			key: "new-file",
			label: translation.ProjectTree.NewFile,
			hint: "+",
			onClick: onNewFile,
		});
	}
	if (onNewFolder) {
		menuItems.push({
			key: "new-folder",
			label: translation.ProjectTree.NewFolder,
			hint: "+",
			onClick: onNewFolder,
		});
	}
	if (onSendToAgent) {
		menuItems.push({
			key: "send-to-agent",
			label: translation.Agents.SendToAgent,
			onClick: onSendToAgent,
		});
	}
	if (onRename) {
		menuItems.push({
			key: "rename",
			label: translation.ProjectTree.ContextRename,
			hint: "F2",
			onClick: onRename,
		});
	}
	if (onDelete) {
		menuItems.push({
			key: "delete",
			label: translation.ProjectTree.ContextDelete,
			hint: "Del",
			onClick: onDelete,
		});
	}
	if (onRevealInFinder) {
		menuItems.push({
			key: "reveal-in-finder",
			label: translation.ProjectTree.RevealInFinder,
			onClick: onRevealInFinder,
		});
	}

	if (menuItems.length === 0) return null;

	const menuHeight = menuItems.length * ROW_HEIGHT + MENU_PADDING;
	const left = Math.min(position.x, globalThis.innerWidth - MENU_WIDTH - 12);
	const top = Math.min(position.y, globalThis.innerHeight - menuHeight - 12);

	/**
	 * Into the body, not beside the row it belongs to. A modal wrapper carries a
	 * transform while it animates in, and a transform makes its box the
	 * containing block for anything `fixed` inside it — which would resolve
	 * these viewport coordinates against the panel instead of the window.
	 */
	return createPortal(
		<div
			className="fixed z-[60] min-w-[10.5rem] rounded-[16px] border border-border bg-soft p-2 shadow-panel"
			style={{ left, top }}
		>
			{menuItems.map((item) => (
				<button
					key={item.key}
					type="button"
					onClick={item.onClick}
					className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-text transition-colors hover:bg-accent/10 hover:text-accent"
				>
					{t(item.label)}
					{item.hint ? (
						<PillText as="span" className="text-muted">
							{item.hint}
						</PillText>
					) : null}
				</button>
			))}
		</div>,
		document.body,
	);
}
