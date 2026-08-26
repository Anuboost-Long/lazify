import { ipcRenderer } from "electron";

export function subscribe<T>(channel: string, callback: (payload: T) => void): () => void {
	const listener = (_event: Electron.IpcRendererEvent, payload: T) => callback(payload);

	ipcRenderer.on(channel, listener);

	return () => {
		ipcRenderer.removeListener(channel, listener);
	};
}
