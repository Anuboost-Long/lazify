import { useCallback, useRef, useState } from "react";

import {
	clampFrame,
	defaultFrame,
	type DesktopBounds,
	type DesktopWindowId,
	type WindowFrame,
} from "./window-frame";

const FRAMES_STORAGE_KEY = "lazify-desktop-frames";

export interface DesktopWindowState {
	id: DesktopWindowId;
	/** The size it returns to; a maximized window is drawn from the bounds. */
	frame: WindowFrame;
	z: number;
	minimized: boolean;
	maximized: boolean;
}

function readStoredFrames(): Partial<Record<DesktopWindowId, WindowFrame>> {
	try {
		const stored = globalThis.localStorage.getItem(FRAMES_STORAGE_KEY);

		return stored ? (JSON.parse(stored) as Partial<Record<DesktopWindowId, WindowFrame>>) : {};
	} catch {
		// A remembered position is a convenience, never a reason to fail.
		return {};
	}
}

function persistFrames(frames: Partial<Record<DesktopWindowId, WindowFrame>>) {
	try {
		globalThis.localStorage.setItem(FRAMES_STORAGE_KEY, JSON.stringify(frames));
	} catch {
		// Private windows and cleared site data both land here.
	}
}

export function useDesktopWindows(bounds: DesktopBounds) {
	const [windows, setWindows] = useState<DesktopWindowState[]>([]);
	const nextZ = useRef(0);

	const isOpen = useCallback(
		(id: DesktopWindowId) => windows.some((window) => window.id === id),
		[windows],
	);

	const focusWindow = useCallback((id: DesktopWindowId) => {
		nextZ.current += 1;
		const z = nextZ.current;

		setWindows((current) => current.map((window) => (window.id === id ? { ...window, z } : window)));
	}, []);

	const openWindow = useCallback(
		(id: DesktopWindowId) => {
			if (isOpen(id)) {
				setWindows((current) =>
					current.map((window) => (window.id === id ? { ...window, minimized: false } : window)),
				);
				focusWindow(id);
				return;
			}

			const stored = readStoredFrames()[id];
			const frame = clampFrame(stored ?? defaultFrame(id, bounds), bounds);

			nextZ.current += 1;
			setWindows((current) => [
				...current,
				{ id, frame, z: nextZ.current, minimized: false, maximized: false },
			]);
		},
		[bounds, focusWindow, isOpen],
	);

	const closeWindow = useCallback(
		(id: DesktopWindowId) => setWindows((current) => current.filter((window) => window.id !== id)),
		[],
	);

	const toggleMinimized = useCallback(
		(id: DesktopWindowId) =>
			setWindows((current) =>
				current.map((window) =>
					window.id === id ? { ...window, minimized: !window.minimized } : window,
				),
			),
		[],
	);

	const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const toggleMaximized = useCallback(
		(id: DesktopWindowId) =>
			setWindows((current) =>
				current.map((window) =>
					window.id === id ? { ...window, maximized: !window.maximized, minimized: false } : window,
				),
			),
		[],
	);

	const setFrame = useCallback((id: DesktopWindowId, frame: WindowFrame) => {
		setWindows((current) =>
			current.map((window) => (window.id === id ? { ...window, frame } : window)),
		);

		if (persistTimer.current) clearTimeout(persistTimer.current);
		persistTimer.current = setTimeout(
			() => persistFrames({ ...readStoredFrames(), [id]: frame }),
			250,
		);
	}, []);

	return {
		windows,
		isOpen,
		openWindow,
		closeWindow,
		focusWindow,
		toggleMinimized,
		toggleMaximized,
		setFrame,
	};
}
