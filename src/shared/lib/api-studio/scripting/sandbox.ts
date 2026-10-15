import { DEFAULT_SCRIPT_GLOBAL, isUsableGlobal } from "./global-name";
import { postmanFacade } from "./postman-facade";
import { POSTMAN_GLOBAL } from "./postman-map";

const SAFE_GLOBALS = {
	JSON,
	Math,
	Date,
	URL,
	URLSearchParams,
	TextEncoder,
	TextDecoder,
	encodeURIComponent,
	decodeURIComponent,
	encodeURI,
	decodeURI,
	atob,
	btoa,
};

/**
 * `node:vm`'s stripped context never had these either — a script could only
 * touch what `api` gave it. This sandbox runs in a Worker instead (no
 * `node:vm` in the webview), which otherwise keeps the ambient network and
 * timer surfaces; shadowing them here denies a script the same reach vm did.
 */
const DENIED_GLOBALS = {
	fetch: undefined,
	XMLHttpRequest: undefined,
	WebSocket: undefined,
	setTimeout: undefined,
	setInterval: undefined,
	importScripts: undefined,
	indexedDB: undefined,
	/** Undefined in any real browser/worker already — denied explicitly so running this under Node (tests) makes the same promise. */
	process: undefined,
	require: undefined,
};

function messageOf(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/**
 * Only safe to call from inside the sandbox worker (`sandbox-worker.ts`) —
 * that worker, not this function, is what contains a script that never
 * returns: a plain `new Function` call has no way to interrupt itself.
 */
export function runInSandbox(
	source: string,
	api: Record<string, unknown>,
	globalName = DEFAULT_SCRIPT_GLOBAL,
): string | null {
	const named = isUsableGlobal(globalName) ? globalName : DEFAULT_SCRIPT_GLOBAL;
	const native = api[DEFAULT_SCRIPT_GLOBAL] as Record<string, unknown>;
	const context: Record<string, unknown> = {
		...SAFE_GLOBALS,
		...DENIED_GLOBALS,
		...api,
		[named]: native,
		...(named === POSTMAN_GLOBAL ? { [POSTMAN_GLOBAL]: postmanFacade(native) } : {}),
	};

	try {
		const names = Object.keys(context);

		// Running the user's own request script is the feature. The containment is
		// the allow-listed/denied context above and the worker boundary around this.
		const script = new Function(...names, `"use strict";\n${source}`); // NOSONAR

		script(...names.map((name) => context[name])); // NOSONAR

		return null;
	} catch (error) {
		return messageOf(error);
	}
}
