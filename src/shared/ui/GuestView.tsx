import { useEffect, useRef, useSyncExternalStore } from "react";

import { openGuest, type Guest, type GuestSession } from "@/platform/browser-view";

// A page in a view draws above the app's own, whatever its z-index, so a
// dropdown that opens over one would open underneath it. While any is open,
// every view steps aside.
let covers = 0;
const coverListeners = new Set<() => void>();

const subscribeToCovers = (listener: () => void) => {
	coverListeners.add(listener);
	return () => {
		coverListeners.delete(listener);
	};
};
const isCovered = () => covers > 0;

/** Hides every page while `open`, so whatever opens over them can be seen. */
export function useCoverGuests(open: boolean) {
	useEffect(() => {
		if (!open) return;

		covers += 1;
		coverListeners.forEach((listener) => listener());
		return () => {
			covers -= 1;
			coverListeners.forEach((listener) => listener());
		};
	}, [open]);
}

interface GuestViewProps {
	session: GuestSession;
	/** The first address. Later ones go through the guest, so a re-render never reloads the page. */
	url: string;
	visible: boolean;
	onGuest: (guest: Guest | null) => void;
	className?: string;
}

/**
 * A page from elsewhere, placed over this element's box and kept there.
 *
 * The view is native and only follows the box when told to, so every change
 * in the box's size — a window resize, a panel opening beside it — places it
 * again.
 */
export function GuestView({ session, url, visible, onGuest, className }: Readonly<GuestViewProps>) {
	const box = useRef<HTMLDivElement>(null);
	const guest = useRef<Guest | null>(null);
	const covered = useSyncExternalStore(subscribeToCovers, isCovered);
	const shown = visible && !covered;

	const initial = useRef({ session, url, shown, onGuest });

	useEffect(() => {
		const element = box.current;
		if (!element) return;

		const { session, url, shown, onGuest } = initial.current;
		const opened = openGuest(session, url, element.getBoundingClientRect(), shown);
		guest.current = opened;
		onGuest(opened);

		const place = () => opened.place(element.getBoundingClientRect());
		const observer = new ResizeObserver(place);
		observer.observe(element);
		observer.observe(document.documentElement);
		globalThis.addEventListener("resize", place);

		return () => {
			observer.disconnect();
			globalThis.removeEventListener("resize", place);
			guest.current = null;
			onGuest(null);
			opened.close();
		};
	}, []);

	useEffect(() => {
		const current = guest.current;
		const element = box.current;
		if (!current || !element) return;

		// The layout may have moved while it was hidden.
		if (shown) current.place(element.getBoundingClientRect());
		current.show(shown);
	}, [shown]);

	return <div ref={box} className={className} />;
}
