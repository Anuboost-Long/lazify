import type { RegistryRelease } from "./types";

const OPEN_VSX_API = "https://open-vsx.org/api";

const REQUEST_TIMEOUT_MS = 10_000;

interface OpenVsxResponse {
	version?: string;
	license?: string;
	timestamp?: string;
	files?: { download?: string };
}

export async function fetchLatestRelease(
	namespace: string,
	name: string,
): Promise<RegistryRelease | null> {
	const response = await fetch(`${OPEN_VSX_API}/${namespace}/${name}`, {
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		headers: { accept: "application/json" },
	});

	if (!response.ok) return null;

	const payload = (await response.json()) as OpenVsxResponse;
	const downloadUrl = payload.files?.download;

	if (!payload.version || !downloadUrl) return null;

	return {
		version: payload.version,
		license: payload.license ?? null,
		publishedAt: payload.timestamp ?? null,
		downloadUrl,
	};
}

/**
 * A whole-transfer budget cannot fit both a 2 MB extension and a 200 MB one, so
 * what is timed is silence: the download is given up on only once bytes stop
 * arriving.
 */
const STALL_TIMEOUT_MS = 30_000;

export type DownloadReporter = (receivedBytes: number, totalBytes: number | null) => void;

export async function downloadRelease(
	release: RegistryRelease,
	onProgress: DownloadReporter = () => undefined,
): Promise<Buffer> {
	const controller = new AbortController();
	let stalled: ReturnType<typeof setTimeout> | null = null;

	const armStallTimer = () => {
		if (stalled) clearTimeout(stalled);

		stalled = setTimeout(() => controller.abort(), STALL_TIMEOUT_MS);
	};

	armStallTimer();

	try {
		const response = await fetch(release.downloadUrl, { signal: controller.signal });

		if (!response.ok) throw new Error(`Download failed with status ${response.status}`);
		if (!response.body) throw new Error("Download returned no content");

		const reader = response.body.getReader();
		const chunks: Uint8Array[] = [];
		/** Absent on a chunked response, which is why the bar has to cope without it. */
		const declared = Number(response.headers.get("content-length"));
		const totalBytes = Number.isFinite(declared) && declared > 0 ? declared : null;
		let receivedBytes = 0;

		onProgress(0, totalBytes);

		for (;;) {
			const { done, value } = await reader.read();

			if (done) break;

			armStallTimer();
			chunks.push(value);
			receivedBytes += value.byteLength;
			onProgress(receivedBytes, totalBytes);
		}

		return Buffer.concat(chunks);
	} finally {
		if (stalled) clearTimeout(stalled);
	}
}
