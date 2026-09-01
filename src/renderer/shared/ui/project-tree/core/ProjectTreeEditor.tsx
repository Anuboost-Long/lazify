import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { useDiagnostics } from "@renderer/shared/hooks/use-diagnostics";
import { CodeSurface } from "@renderer/shared/ui/code/CodeSurface";
import { findingReference } from "@renderer/shared/ui/code/diagnostics/diagnostic-snippet";
import { FindingsPanel } from "@renderer/shared/ui/code/diagnostics/FindingsPanel";
import { DiffEditorPanel } from "@renderer/shared/ui/code/diff/DiffEditorPanel";
import type { DiffViewMode } from "@renderer/shared/ui/code/diff/DiffView";
import { EditorEmptyState } from "@renderer/shared/ui/code/EditorEmptyState";
import { EditorPaneNotice, EditorPaneShell } from "@renderer/shared/ui/code/EditorPaneShell";
import type { EditorTab } from "@renderer/shared/ui/code/EditorTabBar";
import {
	getFilePreviewKind,
	getRenderedPreviewKind,
} from "@renderer/shared/ui/code/preview/file-preview-kind";
import { FilePreview } from "@renderer/shared/ui/code/preview/FilePreview";
import type { SymbolPosition } from "@renderer/shared/ui/code/symbol-at-point";

import { ProjectTreeEditorToolbar } from "./ProjectTreeEditorToolbar";
import type { FileContentState } from "./types";

interface ProjectTreeEditorProps {
	selectedNode: {
		name: string;
		type: "file" | "folder";
		absolutePath?: string;
	} | null;
	selectedFileState: FileContentState | null;
	editable?: boolean;
	selectedPath?: string | null;
	onContentChange?: (value: string) => void;
	headerAction?: ReactNode;
	tabs?: ReactNode;
	activeTab?: EditorTab | null;
	onCloseAll?: () => void;
	openTabCount?: number;
	onOpenSymbol?: (symbol: string, position?: SymbolPosition) => void;
	focusLine?: number | null;
}

export function ProjectTreeEditor({
	selectedNode,
	selectedFileState,
	editable = false,
	selectedPath,
	onContentChange,
	headerAction,
	tabs,
	activeTab = null,
	onCloseAll,
	openTabCount = 0,
	onOpenSymbol,
	focusLine,
}: Readonly<ProjectTreeEditorProps>) {
	const { t } = useTranslation();
	const isDiff = !editable && activeTab?.kind === "diff";
	const [diffMode, setDiffMode] = useState<DiffViewMode>("unified");
	const [svgMode, setSvgMode] = useState<"preview" | "code">("preview");
	const isFile = selectedNode?.type === "file";
	const status = selectedFileState?.status;
	const pending = !editable && (!selectedFileState || status === "idle" || status === "loading");
	const previewKind = isFile && !isDiff ? getFilePreviewKind(selectedNode.name) : "text";
	const renderedKind = getRenderedPreviewKind(
		previewKind,
		svgMode,
		Boolean(selectedFileState?.mimeType),
	);

	const filePath = isFile ? (selectedNode.absolutePath ?? selectedPath ?? null) : null;
	const content = selectedFileState?.content ?? "";
	// Only what is on screen as code gets analysed: a diff, a rendered preview or
	// a file still loading has nothing to underline.
	const quality = useDiagnostics(filePath, content, isFile && !isDiff && !renderedKind && !pending);
	const findings = useMemo(
		() =>
			quality.diagnostics
				.map((diagnostic) => findingReference(content, filePath, diagnostic))
				.filter((finding) => finding !== null),
		[content, filePath, quality.diagnostics],
	);
	/**
	 * A line reached from the findings list. Held apart from the `focusLine`
	 * prop, which belongs to go-to-definition: whichever moved last wins, so
	 * neither pins the pane against the other.
	 */
	const [revealedLine, setRevealedLine] = useState<number | null>(null);

	if (!tabs && !isFile) {
		return <EditorEmptyState />;
	}

	const body = () => {
		if (!isFile) {
			return (
				<EditorPaneNotice
					chrome="flush"
					title={t(
						editable
							? translation.ProjectTree.SelectFileToEdit
							: translation.ProjectTree.SelectFileToPreview,
					)}
					description={t(
						editable
							? translation.ProjectTree.SelectFileToEditDesc
							: translation.ProjectTree.SelectFileToPreviewDesc,
					)}
				/>
			);
		}

		if (pending) {
			return (
				<EditorPaneNotice
					chrome="flush"
					title={t(translation.ProjectTree.LoadingFilePreview)}
					description={t(translation.ProjectTree.LoadingFilePreviewDesc)}
				/>
			);
		}

		if (!editable && status === "error") {
			return (
				<EditorPaneNotice
					chrome="flush"
					tone="error"
					title={t(translation.ProjectTree.LoadFilePreviewError)}
					description={selectedFileState?.content}
				/>
			);
		}

		if (isDiff) {
			return (
				<DiffEditorPanel
					content={selectedFileState?.content ?? ""}
					mode={diffMode}
					fileName={selectedNode.name}
				/>
			);
		}

		if (renderedKind) {
			return (
				<FilePreview
					kind={renderedKind}
					fileName={selectedNode.name}
					content={selectedFileState?.content ?? ""}
					mimeType={selectedFileState?.mimeType ?? "image/svg+xml"}
					byteLength={selectedFileState?.byteLength}
				/>
			);
		}

		return (
			<CodeSurface
				editable={editable}
				variant="flush"
				content={content}
				fileName={selectedNode.name}
				filePath={filePath}
				diagnostics={quality.diagnostics}
				onContentChange={editable ? onContentChange : undefined}
				onOpenSymbol={editable ? undefined : onOpenSymbol}
				focusLine={focusLine ?? revealedLine}
			/>
		);
	};

	return (
		<EditorPaneShell
			chrome="flush"
			tabs={tabs}
			headerAction={
				<ProjectTreeEditorToolbar
					action={headerAction}
					diffMode={isDiff ? diffMode : undefined}
					onDiffModeChange={isDiff ? setDiffMode : undefined}
					svgMode={previewKind === "svg" ? svgMode : undefined}
					onSvgModeChange={previewKind === "svg" ? setSvgMode : undefined}
					onCloseAll={onCloseAll}
					openTabCount={openTabCount}
					hasTabs={Boolean(tabs)}
				/>
			}
			icon={editable ? "package" : "page"}
			title={isFile ? selectedNode.name : t(translation.ProjectTree.NoFileSelected)}
			subtitle={
				isFile
					? (selectedPath ?? selectedNode.absolutePath ?? selectedNode.name)
					: t(translation.ProjectTree.SelectFileFromExplorer)
			}
			badge={t(editable ? translation.ProjectTree.Editable : translation.ProjectTree.ReadOnly)}
			footer={
				findings.length > 0 ? <FindingsPanel findings={findings} onReveal={setRevealedLine} /> : null
			}
		>
			{body()}
		</EditorPaneShell>
	);
}
