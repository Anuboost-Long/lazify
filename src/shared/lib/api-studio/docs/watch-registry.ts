import { watchDocDraft } from "./draft-watch";

/**
 * One window, not one per Electron `sender`: a watcher keyed by collection id
 * is enough, where Electron kept a map keyed by `${senderId}:${collectionId}`.
 */
const watchers = new Map<string, () => void>();
const listeners = new Set<(collectionId: string) => void>();

export function onCollectionDocDraftChanged(callback: (collectionId: string) => void): () => void {
	listeners.add(callback);

	return () => {
		listeners.delete(callback);
	};
}

export async function watchCollectionDocDraft(projectPath: string, collectionId: string): Promise<boolean> {
	watchers.get(collectionId)?.();
	watchers.delete(collectionId);

	const stop = await watchDocDraft(projectPath, collectionId, () => {
		for (const listener of listeners) listener(collectionId);
	});

	if (!stop) return false;

	watchers.set(collectionId, stop);

	return true;
}

export async function unwatchCollectionDocDraft(collectionId: string): Promise<void> {
	watchers.get(collectionId)?.();
	watchers.delete(collectionId);
}
