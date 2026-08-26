import { useCallback, useState, type MouseEvent, type RefObject } from "react";

import {
	readCodeSelection,
	readTextareaSelection,
	type CodeSelectionAction,
	type CodeSelectionContext,
} from "./code-selection";
import type { CodeMenuItem } from "./CodeContextMenu";
import { useCodeSelectionActions } from "./selection-actions";

/**
 * The right-click menu over code.
 *
 * What was selected has to be read at the moment of the click — from the
 * textarea while editing, from the painted text while reading — and held until
 * an item is chosen, because opening the menu is what takes the focus away.
 */

interface CodeMenu {
	editable: boolean;
	code: RefObject<HTMLPreElement | null>;
	textarea: RefObject<HTMLTextAreaElement | null>;
	filePath?: string | null;
	fileName?: string | null;
	/** Overrides the actions this surface would otherwise inherit. */
	selectionActions?: CodeSelectionAction[];
}

export function useCodeMenu({
	editable,
	code,
	textarea,
	filePath,
	fileName,
	selectionActions,
}: CodeMenu) {
	const inherited = useCodeSelectionActions();
	const actions = selectionActions ?? inherited;
	const [menu, setMenu] = useState<{
		at: { x: number; y: number };
		selection: CodeSelectionContext;
	} | null>(null);

	const close = useCallback(() => setMenu(null), []);

	const onContextMenu = (event: MouseEvent<HTMLPreElement | HTMLTextAreaElement>) => {
		if (actions.length === 0) return;

		const selection = editable
			? readTextareaSelection(textarea.current)
			: code.current && readCodeSelection(code.current);

		if (!selection) return;

		event.preventDefault();
		setMenu({
			at: { x: event.clientX, y: event.clientY },
			selection: { ...selection, filePath: filePath ?? null, fileName: fileName ?? null },
		});
	};

	const items: CodeMenuItem[] = actions.map((action) => ({
		id: action.id,
		label: action.label,
		icon: action.icon,
		disabled: action.disabled,
		onSelect: () => {
			if (menu) action.onSelect(menu.selection);
		},
	}));

	return { close, items, onContextMenu, position: menu?.at ?? null };
}
