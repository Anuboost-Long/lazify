import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { AgentGlyph } from "@renderer/features/agents/components/AgentGlyph";
import { translation } from "@renderer/i18n/translation";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";
import { Tooltip } from "@renderer/shared/ui/Tooltip";

import type { DesktopWindowId } from "./window-frame";

export interface DockItem {
	id: DesktopWindowId;
	title: string;
	icon: UiIconName;
	agentId?: string | null;
	minimized: boolean;
	focused: boolean;
}

interface DesktopDockProps {
	items: DockItem[];
	z: number;
	onSelect: (id: DesktopWindowId) => void;
	onCloseAll: () => void;
}

const TILE = clsx(
	"flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border",
	"transition-[transform,background-color,border-color,color] duration-150",
	"motion-safe:hover:-translate-y-0.5",
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accentSoft",
);

export function DesktopDock({ items, z, onSelect, onCloseAll }: Readonly<DesktopDockProps>) {
	const { t } = useTranslation();

	return (
		<nav
			aria-label={t(translation.Home.OpenWindows)}
			style={{ zIndex: z }}
			className={clsx(
				"absolute bottom-3 left-1/2 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-1.5",
				"overflow-x-auto rounded-2xl border border-border bg-soft/90 p-2 shadow-panel backdrop-blur",
			)}
		>
			{items.map((item) => (
				<Tooltip key={item.id} content={item.title} side="top">
					<button
						type="button"
						onClick={() => onSelect(item.id)}
						aria-label={item.title}
						aria-pressed={!item.minimized}
						className={clsx(
							TILE,
							"relative",
							item.focused && !item.minimized
								? "border-accent/40 bg-accent/10 text-accent"
								: "border-transparent text-muted hover:bg-text/5 hover:text-text",
							item.minimized && "opacity-60",
						)}
					>
						{item.agentId === undefined ? (
							<UiIcon name={item.icon} className="h-5 w-5" />
						) : (
							<AgentGlyph agentId={item.agentId ?? ""} className="h-5 w-5" />
						)}

						{item.minimized ? null : (
							<span
								aria-hidden
								className={clsx(
									"absolute bottom-1 h-1 w-1 rounded-full",
									item.focused ? "bg-accent" : "bg-muted",
								)}
							/>
						)}
					</button>
				</Tooltip>
			))}

			<span aria-hidden className="mx-0.5 h-8 w-px shrink-0 bg-border" />

			<Tooltip content={t(translation.Home.CloseAllWindows)} side="top">
				<button
					type="button"
					onClick={onCloseAll}
					aria-label={t(translation.Home.CloseAllWindows)}
					className={clsx(TILE, "border-transparent text-muted hover:bg-text/5 hover:text-text")}
				>
					<UiIcon name="xmark" className="h-4 w-4" />
				</button>
			</Tooltip>
		</nav>
	);
}
