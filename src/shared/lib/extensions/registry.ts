import { getJson } from "@/platform/http";

import type { RegistryRelease } from "./types";

const OPEN_VSX_API = "https://open-vsx.org/api";

const REQUEST_TIMEOUT_MS = 10_000;

interface OpenVsxResponse {
	version?: string;
	license?: string;
	timestamp?: string;
	files?: { download?: string };
}

/** The newest release Open VSX has, or null when it answers without one. */
export async function fetchLatestRelease(
	namespace: string,
	name: string,
): Promise<RegistryRelease | null> {
	const response = await getJson(`${OPEN_VSX_API}/${namespace}/${name}`, { accept: "application/json" }, REQUEST_TIMEOUT_MS);

	if (!response.ok) return null;

	const payload = response.data as OpenVsxResponse;
	const downloadUrl = payload.files?.download;

	if (!payload.version || !downloadUrl) return null;

	return {
		version: payload.version,
		license: payload.license ?? null,
		publishedAt: payload.timestamp ?? null,
		downloadUrl,
	};
}

export type DownloadReporter = (receivedBytes: number, totalBytes: number | null) => void;
