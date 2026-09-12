// The main build compiles without the DOM lib; this preload is the one file
// that runs in a page and needs it.
/// <reference lib="dom" />

import { ipcRenderer, webUtils } from "electron";

/**
 * `File.path` was removed from sandboxed renderers; `webUtils.getPathForFile`
 * is the replacement, and it only exists in a preload's Node-ish context — the
 * page script the recorder injects via CDP can see the same `<input>` but has
 * no way to resolve it back to a real filesystem path. So this preload's only
 * job is to watch for file inputs changing and hand the real path back to the
 * main process, which pairs it with the selector the page script already
 * recorded for that same native "change" event.
 *
 * The channel name is duplicated in `recorder-session.ts` rather than shared
 * — this bundle is built separately from the main process, and it is one
 * string literal that has to stay in sync either way.
 */
const RECORDER_FILE_PATH_CHANNEL = "lazify:diagnostics-recorder-file-path";

document.addEventListener(
	"change",
	(event) => {
		const target = event.target;
		if (!(target instanceof HTMLInputElement) || target.type !== "file") return;

		const file = target.files?.[0];
		if (!file) return;

		let path = "";
		try {
			path = webUtils.getPathForFile(file);
		} catch {
			return;
		}
		if (!path) return;

		ipcRenderer.send(RECORDER_FILE_PATH_CHANNEL, { name: file.name, path });
	},
	true,
);
