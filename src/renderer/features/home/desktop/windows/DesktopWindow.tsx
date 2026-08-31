import clsx from "clsx";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { CaptionText } from "@renderer/shared/typography";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";

import { useWindowGesture } from "./use-window-gesture";
import type { DesktopBounds, WindowFrame } from "./window-frame";

interface DesktopWindowProps {
	title: string;
	icon: UiIconName;
	frame: WindowFrame;
	bounds: DesktopBounds;
	z: number;
	minimized: boolean;
	maximized: boolean;
	focused: boolean;
	children: ReactNode;
	onFrameChange: (frame: WindowFrame) => void;
	onFocus: () => void;
	onToggleMinimized: () => void;
	onToggleMaximized: () => void;
	onClose: () => void;
}

export function DesktopWindow({
	title,
	icon,
	frame,
	bounds,
	z,
	minimized,
	maximized,
	focused,
	children,
	onFrameChange,
	onFocus,
	onToggleMinimized,
	onToggleMaximized,
	onClose,
}: Readonly<DesktopWindowProps>) {
	const { t } = useTranslation();
	const gesture = useWindowGesture({ frame, bounds, onChange: onFrameChange });

	const control = (label: string, name: UiIconName, onClick: () => void) => (
		<button
			type="button"
			onClick={onClick}
			aria-label={label}
			className={clsx(
				"flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
				"text-muted transition-colors hover:bg-text/10 hover:text-text",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accentSoft",
			)}
		>
			<UiIcon name={name} className="h-3.5 w-3.5" />
		</button>
	);

	return (
		<section
			aria-label={title}
			onPointerDownCapture={() => {
				if (!focused) onFocus();
			}}
			style={{
				left: frame.x,
				top: frame.y,
				width: frame.width,
				height: minimized ? undefined : frame.height,
				zIndex: z,
			}}
			className={clsx(
				"absolute flex flex-col overflow-hidden",
				maximized ? "rounded-none" : "rounded-[14px]",
				"border bg-bg",
				focused ? "border-accent/30 shadow-glow" : "border-border shadow-panel",
			)}
		>
			<header
				onPointerDown={maximized ? undefined : gesture.startMove}
				onDoubleClick={onToggleMaximized}
				className={clsx(
					"flex shrink-0 items-center gap-2 px-2.5 py-2",
					maximized ? "cursor-default" : "cursor-grab active:cursor-grabbing",
					"border-b border-border bg-soft",
				)}
			>
				<UiIcon name={icon} className="h-3.5 w-3.5 shrink-0 text-muted" />
				<CaptionText as="span" className="min-w-0 flex-1 truncate !text-text">
					{title}
				</CaptionText>
				{control(
					t(minimized ? translation.Home.RestoreWindow : translation.Home.MinimizeWindow),
					"minus",
					onToggleMinimized,
				)}
				{control(
					t(maximized ? translation.Home.RestoreSize : translation.Home.MaximizeWindow),
					maximized ? "collapse" : "expand",
					onToggleMaximized,
				)}
				{control(t(translation.Home.CloseWindow), "xmark", onClose)}
			</header>

			{minimized ? null : (
				<>
					<div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

					{maximized ? null : (
						<button
							type="button"
							onPointerDown={gesture.startResize}
							aria-hidden="true"
							tabIndex={-1}
							className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize bg-transparent"
						/>
					)}
				</>
			)}
		</section>
	);
}
