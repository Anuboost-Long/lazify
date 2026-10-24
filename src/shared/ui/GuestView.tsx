import { useEffect, useRef, useSyncExternalStore, type RefObject } from "react";

import { openGuest, type Guest, type GuestSession } from "@/platform/browser-view";

// A page in a view draws above the app's own, whatever its z-index, so a
// dropdown that opens over one would open underneath it. A panel cuts its own
// box out of every view and the page stays live around it; a cover without a
// box hides every view.
let hidingCovers = 0;
const panels = new Set<RefObject<HTMLElement | null>>();
const coverListeners = new Set<() => void>();

const notifyCovers = () => coverListeners.forEach((listener) => listener());
const subscribeToCovers = (listener: () => void) => {
	coverListeners.add(listener);
	return () => {
		coverListeners.delete(listener);
	};
};
const isCovered = () => hidingCovers > 0;

const panelCutouts = () =>
	[...panels].flatMap(({ current }) => {
		if (!current) return [];

		const { x, y, width, height } = current.getBoundingClientRect();
		return [{ x, y, width, height, radius: Number.parseFloat(getComputedStyle(current).borderTopLeftRadius) || 0 }];
	});

/**
 * While `open`, makes room over every page: `panel`'s box is cut out of them,
 * or, without a panel, they are hidden.
 */
export function useCoverGuests(open: boolean, panel?: RefObject<HTMLElement | null>) {
	useEffect(() => {
		if (!open) return;

		if (panel) panels.add(panel);
		else hidingCovers += 1;
		notifyCovers();
		return () => {
			if (panel) panels.delete(panel);
			else hidingCovers -= 1;
			notifyCovers();
		};
	}, [open, panel]);
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
	// A hidden page is placed when it is shown again, not on every resize meanwhile:
	// placing a view lays its page out again, on the thread that draws the window.
	const shownRef = useRef(shown);

	const initial = useRef({ session, url, shown, onGuest });

	useEffect(() => {
		const element = box.current;
		if (!element) return;

		const { session, url, shown, onGuest } = initial.current;
		const opened = openGuest(session, url, element.getBoundingClientRect(), shown);
		guest.current = opened;
		onGuest(opened);

		const cutOut = () => opened.cutOut(panelCutouts());
		const place = () => {
			if (shownRef.current) opened.place(element.getBoundingClientRect());
			if (panels.size > 0) cutOut();
		};
		const observer = new ResizeObserver(place);
		observer.observe(element);
		observer.observe(document.documentElement);
		globalThis.addEventListener("resize", place);
		const stopCutting = subscribeToCovers(cutOut);

		return () => {
			stopCutting();
			observer.disconnect();
			globalThis.removeEventListener("resize", place);
			guest.current = null;
			onGuest(null);
			opened.close();
		};
	}, []);

	useEffect(() => {
		shownRef.current = shown;
		const current = guest.current;
		const element = box.current;
		if (!current || !element) return;

		// The layout may have moved while it was hidden.
		if (shown) current.place(element.getBoundingClientRect());
		current.show(shown);
	}, [shown]);

	return <div ref={box} className={className} />;
}
