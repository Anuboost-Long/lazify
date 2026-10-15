import type { HttpRequestConfig, HttpResponse } from "@chain/sdk";

const chainError = (code: string, message: string) => Object.assign(new Error(message), { code });

const isSuccess = (status: number) => status >= 200 && status < 300;

function headersRecord(headers: globalThis.Headers): Record<string, string> {
	const record: Record<string, string> = {};

	headers.forEach((value, name) => {
		record[name] = record[name] ? `${record[name]}, ${value}` : value;
	});

	return record;
}

function causeChain(error: unknown): string {
	const parts: string[] = [];
	let current: unknown = error;

	for (let depth = 0; depth < 5 && current; depth += 1) {
		if (current instanceof Error) {
			parts.push(current.message);
			current = current.cause;
			continue;
		}

		parts.push(typeof current === "string" ? current : "unknown error");
		current = undefined;
	}

	return parts.join(": ");
}

async function fetchResponse(config: HttpRequestConfig): Promise<{ response: Response; bytes: Uint8Array }> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), config.timeout ?? 30_000);

	try {
		const response = await fetch(config.url, {
			method: config.method ?? "GET",
			headers: config.headers,
			body: config.data as BodyInit | undefined,
			signal: controller.signal,
		});
		const bytes = new Uint8Array(await response.arrayBuffer());

		if (config.maxBytes !== undefined && bytes.byteLength > config.maxBytes) {
			throw chainError("TOO_LARGE", `response is larger than ${config.maxBytes} bytes`);
		}

		return { response, bytes };
	} catch (error) {
		if ((error as { code?: string }).code === "TOO_LARGE") throw error;
		if (error instanceof Error && error.name === "AbortError") {
			throw chainError("UNAVAILABLE", `request to ${config.url} timed out`);
		}

		throw chainError("UNAVAILABLE", causeChain(error));
	} finally {
		clearTimeout(timer);
	}
}

/** A Node-backed fake of `desktop.http`, the same role `node-folders.ts` plays for `desktop.folders`. */
export const nodeHttp = {
	async request<T>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
		const { response, bytes } = await fetchResponse(config);
		const headers = headersRecord(response.headers);
		const base = { status: response.status, statusText: response.statusText, ok: response.ok, headers };

		const result: HttpResponse<T> =
			config.responseType === "bytes"
				? { ...base, body: "", data: bytes as T }
				: (() => {
						const text = new TextDecoder().decode(bytes);
						const isJson = /[/+]json\b/i.test(headers["content-type"] ?? "");

						return { ...base, body: text, data: (isJson ? tryParse(text) : text) as T };
					})();

		if (!(config.validateStatus ?? isSuccess)(result.status)) {
			throw Object.assign(
				new Error(`Request failed with status ${result.status} ${result.statusText}`.trimEnd()),
				{ code: "HTTP_ERROR", response: result },
			);
		}

		return result;
	},
};

function tryParse(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}
