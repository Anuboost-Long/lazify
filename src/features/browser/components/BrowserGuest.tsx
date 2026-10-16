import { memo, useEffect, useRef, useState } from "react";

import type { Guest } from "@/platform/browser-view";
import { GuestView } from "@/shared/ui/GuestView";

import type { BrowserTab } from "../hooks/use-browser-tabs";
import { usePageLoadError } from "../hooks/use-page-load-error";
import { BrowserErrorPage } from "./errors";

export interface GuestStatus {
	ready: boolean;
	loading: boolean;
	canGoBack: boolean;
	canGoForward: boolean;
}

interface BrowserGuestProps {
	tab: BrowserTab;
	active: boolean;
	/** False while the whole browser page is off-screen. */
	surfaceVisible: boolean;
	/** Hands the element to the surface so the toolbar can drive it. */
	onRegister: (tabId: string, view: Guest | null) => void;
	onStatus: (tabId: string, status: Partial<GuestStatus>) => void;
	onNavigate: (tabId: string, url: string, title: string) => void;
}

/**
 * One tab's page.
 *
 * Every guest stays mounted for as long as its tab exists — switching tabs only
 * changes which one is on top. Unmounting would stop whatever it is playing,
 * which is the whole point of this surface.
 */
export const BrowserGuest = memo(function BrowserGuest({
	tab,
	active,
	surfaceVisible,
	onRegister,
	onStatus,
	onNavigate,
}: Readonly<BrowserGuestProps>) {
	const viewRef = useRef<Guest | null>(null);
	const [ready, setReady] = useState(false);
	const { error, retry } = usePageLoadError(viewRef, tab);

	/**
	 * The address we last asked this guest to load.
	 *
	 * The tab's address is compared against this rather than against the guest's
	 * own URL, because the two are not the same thing and were never going to
	 * match: a page that redirects — or merely normalises, `https://youtube.com`
	 * arriving as `https://www.youtube.com/` — reports something the user never
	 * typed. Comparing against that made every such page load a second time, and
	 * a second navigation landing on a player that is still starting up leaves
	 * the video sitting there doing nothing until the page is reloaded by hand.
	 */
	const requestedUrl = useRef(tab.url);
	/** Which submission that address came from; see `navSeq` on the tab. */
	const requestedSeq = useRef(tab.navSeq);

	useEffect(() => {
		const view = viewRef.current;
		if (!view) return;

		// Every read can throw while the guest is detached, and an uncaught throw
		// from a DOM handler takes the whole app's tree down.
		const safely = <T,>(read: () => T, fallback: T): T => {
			try {
				return read();
			} catch {
				return fallback;
			}
		};

		const syncHistory = () =>
			onStatus(tab.id, {
				canGoBack: safely(() => view.canGoBack(), false),
				canGoForward: safely(() => view.canGoForward(), false),
			});

		const onReady = () => {
			setReady(true);
			onStatus(tab.id, { ready: true });
			syncHistory();
		};
		const onStart = () => onStatus(tab.id, { loading: true });
		const onStop = () => {
			onStatus(tab.id, { loading: false });
			syncHistory();
		};
		const onDidNavigate = () => {
			const url = safely(() => view.getURL(), "");
			if (url)
				onNavigate(
					tab.id,
					url,
					safely(() => view.getTitle(), ""),
				);
			syncHistory();
		};
		const onTitle = (event: Event) => {
			const { title } = event as Event & { title?: string };
			if (title)
				onNavigate(
					tab.id,
					safely(() => view.getURL(), tab.url),
					title,
				);
		};

		view.addEventListener("dom-ready", onReady);
		view.addEventListener("did-start-loading", onStart);
		view.addEventListener("did-stop-loading", onStop);
		view.addEventListener("did-navigate", onDidNavigate);
		view.addEventListener("did-navigate-in-page", onDidNavigate);
		view.addEventListener("page-title-updated", onTitle);

		return () => {
			view.removeEventListener("dom-ready", onReady);
			view.removeEventListener("did-start-loading", onStart);
			view.removeEventListener("did-stop-loading", onStop);
			view.removeEventListener("did-navigate", onDidNavigate);
			view.removeEventListener("did-navigate-in-page", onDidNavigate);
			view.removeEventListener("page-title-updated", onTitle);
		};
	}, [tab.id, tab.url, onStatus, onNavigate]);

	// Drives the guest once it can be driven. The first load needs nothing here,
	// since the tag mounted with its src already set.
	useEffect(() => {
		const view = viewRef.current;
		if (!view || !ready) return;
		if (tab.url === requestedUrl.current && tab.navSeq === requestedSeq.current) {
			return;
		}

		requestedUrl.current = tab.url;
		requestedSeq.current = tab.navSeq;

		void view.loadURL(tab.url).catch(() => undefined);
	}, [ready, tab.navSeq, tab.url]);

	return (
		<div className="absolute inset-0" style={{ zIndex: active ? 1 : 0 }}>
			{/* A tab keeps its view for as long as it exists — hidden, never closed —
			    so whatever it is playing keeps playing. It steps aside for the
			    error screen, which it would otherwise draw over. */}
			<GuestView
				session="browser"
				url={tab.url}
				visible={active && surfaceVisible && !error}
				onGuest={(guest) => {
					viewRef.current = guest;
					onRegister(tab.id, guest);
				}}
				className="absolute inset-0"
			/>

			{error ? (
				<div className="absolute inset-0 z-10 bg-bg">
					<BrowserErrorPage
						error={error}
						onRetry={retry}
						onOpenInSystemBrowser={() => void globalThis.lazify.openExternalUrl(error.url)}
					/>
				</div>
			) : null}
		</div>
	);
});
