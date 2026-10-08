import clsx from "clsx";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@/i18n/translation";
import type { UiIconName } from "@/shared/ui/icons/UiIcon";

import { DesktopClock } from "./clock/DesktopClock";
import { DesktopIcon } from "./DesktopIcon";
import { DesktopBackdrop } from "./personalize/DesktopBackdrop";
import {
	arrangeShortcuts,
	useDesktopPersonalization,
	type DesktopIconPlacement,
} from "./personalize/use-desktop-personalization";
import { DesktopWidgets, type DesktopWidgetData } from "./widgets/DesktopWidgets";
import { DesktopDock } from "./windows/DesktopDock";
import { DesktopWindow } from "./windows/DesktopWindow";
import { useDesktopWindows } from "./windows/use-desktop-windows";
import {
	clampFrame,
	DOCK_HEIGHT,
	type DesktopBounds,
	type DesktopWindowId,
} from "./windows/window-frame";

export interface DesktopShortcut {
	id: string;
	label: string;
	icon: UiIconName;
	/** A window this opens on the desktop, or undefined when it navigates away. */
	windowId?: DesktopWindowId;
	onSelect?: () => void;
}

const PLACEMENT_CLASS: Record<Exclude<DesktopIconPlacement, "center">, string> = {
	top: "inset-x-0 top-4 flex justify-center px-6",
	left: "bottom-20 left-4 top-4 overflow-y-auto",
	right: "bottom-20 right-4 top-4 overflow-y-auto",
};

export interface DesktopWindowTitle {
	title: string;
	icon: UiIconName;
}

interface HomeDesktopProps {
	shortcuts: DesktopShortcut[];
	windowTitle: (id: DesktopWindowId) => DesktopWindowTitle;
	widgetData: DesktopWidgetData;
	onOpenAgents: () => void;
	onOpenProject: (projectPath: string) => void;
	requestedWindow?: DesktopWindowId | null;
	onWindowOpened?: () => void;
	renderWindow: (id: DesktopWindowId) => ReactNode;
}

export function HomeDesktop({
	shortcuts,
	windowTitle,
	widgetData,
	onOpenAgents,
	onOpenProject,
	requestedWindow,
	onWindowOpened,
	renderWindow,
}: Readonly<HomeDesktopProps>) {
	const { t } = useTranslation();
	const surfaceRef = useRef<HTMLDivElement>(null);
	const { personalization, update } = useDesktopPersonalization();
	const [bounds, setBounds] = useState<DesktopBounds>({ width: 1200, height: 720 });
	const desktop = useDesktopWindows(bounds);

	useEffect(() => {
		const surface = surfaceRef.current;
		if (!surface) return;

		const observer = new ResizeObserver(([entry]) =>
			setBounds({
				width: entry.contentRect.width,
				height: Math.max(0, entry.contentRect.height - DOCK_HEIGHT),
			}),
		);

		observer.observe(surface);
		return () => observer.disconnect();
	}, []);

	const { openWindow } = desktop;

	useEffect(() => {
		if (!requestedWindow) return;

		openWindow(requestedWindow);
		onWindowOpened?.();
	}, [onWindowOpened, openWindow, requestedWindow]);

	const { focus } = personalization;

	useEffect(() => {
		if (!focus) return;

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") update({ focus: false });
		};

		globalThis.addEventListener("keydown", onKeyDown);
		return () => globalThis.removeEventListener("keydown", onKeyDown);
	}, [focus, update]);

	const { frontmost } = desktop;
	const placement = personalization.icons;
	const dockVisible = !focus && desktop.windows.length > 0;
	const visibleShortcuts = arrangeShortcuts(shortcuts, personalization.shortcutOrder).filter(
		(shortcut) => !personalization.hiddenShortcuts.includes(shortcut.id),
	);

	const shortcutIcons = (stacked: boolean) => (
		<div
			className={clsx(
				"flex gap-2",
				stacked ? "flex-col items-center" : "flex-wrap items-start justify-center",
			)}
		>
			{visibleShortcuts.map((shortcut) => (
				<DesktopIcon
					key={shortcut.id}
					label={shortcut.label}
					icon={shortcut.icon}
					active={shortcut.windowId ? desktop.isOpen(shortcut.windowId) : false}
					onOpen={() => {
						if (shortcut.windowId) desktop.openWindow(shortcut.windowId);
						else shortcut.onSelect?.();
					}}
				/>
			))}
		</div>
	);

	return (
		<div
			ref={surfaceRef}
			data-desktop-tint={personalization.tint === "accent" ? undefined : personalization.tint}
			className="relative h-full w-full overflow-hidden"
		>
			<DesktopBackdrop backdrop={personalization.backdrop} surface={surfaceRef} />

			{/* `m-auto` rather than `justify-center`: it centres while the content fits, and scrolls instead of clipping the top once it does not. */}
			<div
				style={dockVisible ? { paddingBottom: DOCK_HEIGHT } : undefined}
				className="absolute inset-0 flex overflow-y-auto px-6 py-8"
			>
				<div className="m-auto flex w-full flex-col items-center gap-8">
					<DesktopClock
						size={personalization.clockSize}
						greeting={personalization.greeting}
						name={personalization.name}
						secondZone={personalization.secondZone}
					/>

					{focus ? null : (
						<>
							<DesktopWidgets
								widgets={personalization.widgets}
								data={widgetData}
								onOpenAgents={onOpenAgents}
								onOpenProject={onOpenProject}
							/>

							{placement === "center" ? shortcutIcons(false) : null}
						</>
					)}
				</div>
			</div>

			{focus ? (
				<button
					type="button"
					onClick={() => update({ focus: false })}
					className={clsx(
						"absolute bottom-6 left-1/2 -translate-x-1/2 rounded-lg px-3 py-1.5",
						"text-xs font-semibold text-muted opacity-40",
						"transition-opacity hover:opacity-100",
						"focus-visible:opacity-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accentSoft",
					)}
				>
					{t(translation.Home.FocusLeave)}
				</button>
			) : null}

			{focus || placement === "center" ? null : (
				<div className={clsx("absolute", PLACEMENT_CLASS[placement])}>
					{shortcutIcons(placement !== "top")}
				</div>
			)}

			{(focus ? [] : desktop.windows).map((window) => (
				<DesktopWindow
					key={window.id}
					title={windowTitle(window.id).title}
					icon={windowTitle(window.id).icon}
					frame={
						window.maximized
							? { x: 0, y: 0, width: bounds.width, height: bounds.height }
							: clampFrame(window.frame, bounds)
					}
					bounds={bounds}
					z={window.z}
					minimized={window.minimized}
					maximized={window.maximized}
					focused={window.z === frontmost}
					onFrameChange={(frame) => desktop.setFrame(window.id, frame)}
					onFocus={() => desktop.focusWindow(window.id)}
					onToggleMinimized={() => desktop.toggleMinimized(window.id)}
					onToggleMaximized={() => desktop.toggleMaximized(window.id)}
					onClose={() => desktop.closeWindow(window.id)}
				>
					{renderWindow(window.id)}
				</DesktopWindow>
			))}

			{dockVisible ? (
				<DesktopDock
					items={desktop.windows.map((window) => ({
						id: window.id,
						title: windowTitle(window.id).title,
						icon: windowTitle(window.id).icon,
						minimized: window.minimized,
						focused: window.z === frontmost,
					}))}
					z={frontmost + 1}
					onSelect={(id) => desktop.selectWindow(id)}
					onCloseAll={desktop.closeAllWindows}
				/>
			) : null}
		</div>
	);
}
