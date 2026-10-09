import { desktop } from "@chain/sdk";

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
