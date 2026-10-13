import { getJson } from "@/platform/http";

import type { RegistryRelease } from "./types";

const OPEN_VSX_API = "https://open-vsx.org/api";

const REQUEST_TIMEOUT_MS = 10_000;

interface OpenVsxResponse {
	version?: string;
	license?: string;
	timestamp?: string;
	files?: { download?: string; sha256?: string };
}

/** Each release's published checksum, by download URL, kept off the release the page shows. */
const checksumUrls = new Map<string, string>();

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

	if (payload.files?.sha256) checksumUrls.set(downloadUrl, payload.files.sha256);

	return {
		version: payload.version,
		license: payload.license ?? null,
		publishedAt: payload.timestamp ?? null,
		downloadUrl,
	};
}

/** The sha256 Open VSX published for a release's package. */
export async function fetchChecksum(release: RegistryRelease): Promise<string> {
	const url = checksumUrls.get(release.downloadUrl);
	const response = url ? await getJson(url, {}, REQUEST_TIMEOUT_MS) : null;
	const sha256 = String(response?.ok ? response.data : "").trim().split(/\s+/)[0].toLowerCase();

	if (!/^[0-9a-f]{64}$/.test(sha256)) throw new Error(`Open VSX has no checksum for version ${release.version}`);

	return sha256;
}

export type DownloadReporter = (receivedBytes: number, totalBytes: number | null) => void;
