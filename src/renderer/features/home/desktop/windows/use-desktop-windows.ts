import { useCallback, useEffect, useRef, useState } from "react";

import {
	clampFrame,
	defaultFrame,
	type DesktopBounds,
	type DesktopWindowId,
	type WindowFrame,
} from "./window-frame";

const FRAMES_STORAGE_KEY = "lazify-desktop-frames";
const OPEN_STORAGE_KEY = "lazify-desktop-open-windows";

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

function readOpenWindows(): DesktopWindowState[] {
	try {
		const stored = globalThis.localStorage.getItem(OPEN_STORAGE_KEY);

		return stored ? (JSON.parse(stored) as DesktopWindowState[]) : [];
	} catch {
		// A desktop that comes back empty is a smaller loss than one that throws.
		return [];
	}
}

function persistOpenWindows(windows: DesktopWindowState[]) {
	try {
		globalThis.localStorage.setItem(OPEN_STORAGE_KEY, JSON.stringify(windows));
	} catch {
		// Private windows and cleared site data both land here.
	}
}

export function useDesktopWindows(bounds: DesktopBounds) {
	const [windows, setWindows] = useState<DesktopWindowState[]>(readOpenWindows);
	const nextZ = useRef(windows.reduce((highest, window) => Math.max(highest, window.z), 0));

	useEffect(() => persistOpenWindows(windows), [windows]);

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
			const frame = clampFrame(stored ?? defaultFrame(id, bounds, windows.length), bounds);

			nextZ.current += 1;
			setWindows((current) => [
				...current,
				{ id, frame, z: nextZ.current, minimized: false, maximized: false },
			]);
		},
		[bounds, focusWindow, isOpen, windows.length],
	);

	const closeWindow = useCallback(
		(id: DesktopWindowId) => setWindows((current) => current.filter((window) => window.id !== id)),
		[],
	);

	const closeAllWindows = useCallback(() => setWindows([]), []);

	const toggleMinimized = useCallback(
		(id: DesktopWindowId) =>
			setWindows((current) =>
				current.map((window) =>
					window.id === id ? { ...window, minimized: !window.minimized } : window,
				),
			),
		[],
	);

	const frontmost = windows.reduce((highest, window) => Math.max(highest, window.z), 0);

	const selectWindow = useCallback(
		(id: DesktopWindowId) => {
			const target = windows.find((window) => window.id === id);
			if (!target) return;

			if (target.minimized) openWindow(id);
			else if (target.z === frontmost) toggleMinimized(id);
			else focusWindow(id);
		},
		[focusWindow, frontmost, openWindow, toggleMinimized, windows],
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
		frontmost,
		isOpen,
		openWindow,
		closeWindow,
		closeAllWindows,
		focusWindow,
		selectWindow,
		toggleMinimized,
		toggleMaximized,
		setFrame,
	};
}
