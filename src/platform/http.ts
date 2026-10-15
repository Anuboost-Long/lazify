import { desktop } from "@chain/sdk";
import type { HttpMethod } from "@chain/sdk";

export interface JsonResponse {
	ok: boolean;
	status: number;
	headers: Record<string, string>;
	data: unknown;
}

export async function getJson(url: string, headers: Record<string, string>, timeout: number): Promise<JsonResponse> {
	const response = await desktop.http.get(url, { headers, timeout, validateStatus: () => true });

	return { ok: response.ok, status: response.status, headers: response.headers, data: response.data };
}

export interface RawHttpRequest {
	url: string;
	method: HttpMethod;
	headers: Record<string, string>;
	data?: string | Uint8Array;
	timeout: number;
	maxBytes: number;
	trustLoopbackCertificates: boolean;
}

export interface RawHttpResponse {
	status: number;
	statusText: string;
	headers: Record<string, string>;
	bytes: Uint8Array;
}

/**
 * Always reads the body as bytes: the caller decides itself whether to
 * decode it as text (and how much of it to show), since `desktop.http`'s
 * own truncation (`maxBytes`) only ever rejects outright, never returns a
 * partial body the way a streamed read would.
 */
export async function requestBytes(request: RawHttpRequest): Promise<RawHttpResponse> {
	const response = await desktop.http.request<Uint8Array>({
		url: request.url,
		method: request.method,
		headers: request.headers,
		data: request.data,
		timeout: request.timeout,
		responseType: "bytes",
		maxBytes: request.maxBytes,
		validateStatus: () => true,
		trustLoopbackCertificates: request.trustLoopbackCertificates,
	});

	return {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers,
		bytes: response.data,
	};
}
