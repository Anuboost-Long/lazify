import { useEffect, useRef, useState, type ReactNode } from "react";

import type { UiIconName } from "@renderer/shared/ui/icons/UiIcon";

import { DesktopClock } from "./clock/DesktopClock";
import { DesktopIcon } from "./DesktopIcon";
import { DesktopBackdrop } from "./personalize/DesktopBackdrop";
import { useDesktopPersonalization } from "./personalize/use-desktop-personalization";
import { DesktopWidgets, type DesktopWidgetData } from "./widgets/DesktopWidgets";
import { DesktopWindow } from "./windows/DesktopWindow";
import { useDesktopWindows } from "./windows/use-desktop-windows";
import type { DesktopBounds, DesktopWindowId } from "./windows/window-frame";

export interface DesktopShortcut {
	id: string;
	label: string;
	icon: UiIconName;
	/** A window this opens on the desktop, or undefined when it navigates away. */
	windowId?: DesktopWindowId;
	onSelect?: () => void;
}

interface HomeDesktopProps {
	shortcuts: DesktopShortcut[];
	windowTitles: Record<DesktopWindowId, { title: string; icon: UiIconName }>;
	widgetData: DesktopWidgetData;
	renderWindow: (id: DesktopWindowId) => ReactNode;
}

export function HomeDesktop({
	shortcuts,
	windowTitles,
	widgetData,
	renderWindow,
}: Readonly<HomeDesktopProps>) {
	const surfaceRef = useRef<HTMLDivElement>(null);
	const { personalization } = useDesktopPersonalization();
	const [bounds, setBounds] = useState<DesktopBounds>({ width: 1200, height: 720 });
	const desktop = useDesktopWindows(bounds);

	useEffect(() => {
		const surface = surfaceRef.current;
		if (!surface) return;

		const observer = new ResizeObserver(([entry]) =>
			setBounds({ width: entry.contentRect.width, height: entry.contentRect.height }),
		);

		observer.observe(surface);
		return () => observer.disconnect();
	}, []);

	const frontmost = desktop.windows.reduce<number>(
		(highest, window) => Math.max(highest, window.z),
		0,
	);

	return (
		<div
			ref={surfaceRef}
			data-desktop-tint={personalization.tint === "accent" ? undefined : personalization.tint}
			className="relative h-full w-full overflow-hidden"
		>
			<DesktopBackdrop backdrop={personalization.backdrop} surface={surfaceRef} />

			<div className="absolute inset-0 flex flex-col items-center justify-center gap-10 px-6">
				<DesktopClock dimmed={desktop.windows.length > 0} />

				<DesktopWidgets widgets={personalization.widgets} data={widgetData} />

				<div className="flex flex-wrap items-start justify-center gap-2">
					{shortcuts.map((shortcut) => (
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
			</div>

			{desktop.windows.map((window) => (
				<DesktopWindow
					key={window.id}
					title={windowTitles[window.id].title}
					icon={windowTitles[window.id].icon}
					frame={
						window.maximized ? { x: 0, y: 0, width: bounds.width, height: bounds.height } : window.frame
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
		</div>
	);
}
