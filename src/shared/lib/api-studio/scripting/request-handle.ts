import type { ApiRequestDraft, RequestHeader } from "../runner/types";
import { scriptText } from "./script-text";

export interface RequestHandle {
	handle: Record<string, unknown>;
	draft: () => ApiRequestDraft;
}

function headerApi(headers: RequestHeader[], writable: boolean) {
	const indexOf = (name: string) =>
		headers.findIndex((header) => header.name.toLowerCase() === String(name).toLowerCase());

	const api: Record<string, unknown> = {
		get: (name: string) => (indexOf(name) < 0 ? null : headers[indexOf(name)].value),
		has: (name: string) => indexOf(name) >= 0,
		all: () => headers.map((header) => ({ ...header })),
	};

	if (!writable) return api;

	api.set = (name: string, value: unknown) => {
		const at = indexOf(name);
		const header = { name: String(name), value: scriptText(value) };

		if (at < 0) headers.push(header);
		else headers[at] = header;
	};
	api.remove = (name: string) => {
		const at = indexOf(name);

		if (at >= 0) headers.splice(at, 1);
	};

	return api;
}

export function createRequestHandle(draft: ApiRequestDraft, writable: boolean): RequestHandle {
	const headers = draft.headers.map((header) => ({ ...header }));
	const state = { method: draft.method, url: draft.url, body: draft.body };
	const handle: Record<string, unknown> = { headers: headerApi(headers, writable) };

	Object.defineProperties(handle, {
		method: {
			enumerable: true,
			get: () => state.method,
			set: (value: string) => {
				if (writable) state.method = String(value).toUpperCase() as ApiRequestDraft["method"];
			},
		},
		url: {
			enumerable: true,
			get: () => state.url,
			set: (value: string) => {
				if (writable) state.url = String(value);
			},
		},
		body: {
			enumerable: true,
			get: () => state.body,
			set: (value: unknown) => {
				if (!writable) return;

				state.body = value === null || value === undefined ? null : scriptText(value);
			},
		},
	});

	return {
		handle,
		draft: () => ({ ...draft, method: state.method, url: state.url, body: state.body, headers }),
	};
}
