import clsx from "clsx";
import { memo, useRef } from "react";
import { useTranslation } from "react-i18next";

import { XTermPanel } from "@renderer/features/workspace/components/XTermPanel";
import { translation } from "@renderer/i18n/translation";
import { CaptionText, SmallText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

import type { MonitorPanel, MonitorPanelSize } from "../hooks/use-monitor-panels";
import { AgentGlyph } from "./AgentGlyph";
import { AgentThemeNotice } from "./AgentThemeNotice";

const SIZE_SPAN: Record<MonitorPanelSize, string> = {
	default: "",
	wide: "md:col-span-2",
	tall: "row-span-2",
	large: "md:col-span-2 row-span-2",
};

const SIZE_LABEL: Record<MonitorPanelSize, string> = {
	default: translation.Agents.MonitorSizeDefault,
	wide: translation.Agents.MonitorSizeWide,
	tall: translation.Agents.MonitorSizeTall,
	large: translation.Agents.MonitorSizeLarge,
};

interface AgentMonitorPanelProps {
	panel: MonitorPanel;
	selected: boolean;
	waiting: boolean;
	allowSpan: boolean;
	dragging: boolean;
	dropTarget: boolean;
	onSelect: (runId: string) => void;
	onPickSize: (runId: string) => void;
	onRename: (runId: string) => void;
	onClear: (runId: string) => void;
	onDragStart: (runId: string) => void;
	onDragOver: (runId: string) => void;
	onDragLeave: (runId: string) => void;
	onDrop: (runId: string) => void;
	onDragEnd: () => void;
}

export const AgentMonitorPanel = memo(function AgentMonitorPanel({
	panel,
	selected,
	waiting,
	allowSpan,
	onSelect,
	onPickSize,
	onRename,
	onClear,
	dragging,
	dropTarget,
	onDragStart,
	onDragOver,
	onDragLeave,
	onDrop,
	onDragEnd,
}: Readonly<AgentMonitorPanelProps>) {
	const { t } = useTranslation();
	const { runId } = panel;
	const resizeLabel = t(translation.Agents.MonitorResize, {
		size: t(SIZE_LABEL[panel.size]),
	});

	const rootRef = useRef<HTMLDivElement>(null);

	const borderTone = () => {
		if (dropTarget) return "border-accent";
		if (selected) return "border-accent/60";

		return "border-border";
	};

	return (
		<div
			ref={rootRef}

			onMouseDownCapture={() => onSelect(runId)}
			onFocusCapture={() => onSelect(runId)}

			onDragOver={(event) => {
				if (!dragging) event.preventDefault();
				event.dataTransfer.dropEffect = "move";
				onDragOver(runId);
			}}
			onDragLeave={(event) => {
				if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
				onDragLeave(runId);
			}}
			onDrop={(event) => {
				event.preventDefault();
				onDrop(runId);
			}}
			className={clsx(
				"flex h-full flex-col overflow-hidden rounded-md bg-terminal",
				"border transition-colors duration-150",
				allowSpan && SIZE_SPAN[panel.size],
				dragging && "opacity-40",

				borderTone(),
			)}
		>
			<div
				draggable
				onDragStart={(event) => {
					event.dataTransfer.effectAllowed = "move";

					event.dataTransfer.setData("text/plain", panel.id);
					if (rootRef.current) {
						event.dataTransfer.setDragImage(rootRef.current, 20, 16);
					}
					onDragStart(runId);
				}}
				onDragEnd={onDragEnd}
				title={t(translation.Agents.MonitorReorder)}
				className="flex min-h-12 shrink-0 cursor-grab items-center gap-2 border-b border-border bg-bg px-2.5 py-1.5 active:cursor-grabbing"
			>
				<div className="flex h-5 w-5 shrink-0 items-center justify-center text-muted">
					{panel.kind === "agent" ? (
						<AgentGlyph agentId={panel.sourceId} className="h-3.5 w-3.5" />
					) : (
						<UiIcon name="play" className="h-3 w-3" />
					)}
				</div>

				<button
					type="button"
					onClick={() => onRename(runId)}
					title={t(translation.Agents.MonitorRename)}
					className={clsx(
						"min-w-0 flex-1 rounded-md px-1 py-0.5 text-left transition-colors",
						"hover:bg-text/[0.06]",
					)}
				>
					<SmallText className="block truncate !text-text">{panel.displayName}</SmallText>
					<CaptionText tone="muted" className="block truncate">
						{panel.projectName}
					</CaptionText>
				</button>

				{waiting ? (
					<CaptionText className="shrink-0 !text-accent">
						{t(translation.Agents.NeedsAttention)}
					</CaptionText>
				) : null}

				{panel.exited ? (
					<CaptionText tone="muted" className="shrink-0">
						{t(translation.Agents.MonitorPanelExited)}
					</CaptionText>
				) : null}

				<div className="ml-auto flex shrink-0 items-center gap-0.5 border-l border-border pl-1">
					<IconButton
						icon={panel.size === "large" ? "collapse" : "expand"}
						title={resizeLabel}
						aria-label={resizeLabel}
						onClick={() => onPickSize(runId)}
					/>

					<IconButton
						icon="xmark"
						title={t(translation.Agents.MonitorClearPanel)}
						aria-label={t(translation.Agents.MonitorClearPanel)}
						onClick={() => onClear(runId)}
					/>
				</div>
			</div>

			<div className="flex min-h-0 flex-1 flex-col p-1">
				<AgentThemeNotice session={panel} label={panel.displayName} compact />

				<div className="min-h-0 flex-1">
					<XTermPanel runId={panel.runId} isActive />
				</div>
			</div>
		</div>
	);
});
