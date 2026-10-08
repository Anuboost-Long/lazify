import { desktop } from "@chain/sdk";

import type { RegistryFetch } from "@/shared/lib/package-version-matcher/registry";

export const registryFetch: RegistryFetch = async (url, { accept, timeoutMs }) => {
	const response = await desktop.http.get(url, {
		headers: { Accept: accept, "User-Agent": "lazify/0.1.0" },
		timeout: timeoutMs,
		validateStatus: () => true,
	});

	if (!response.ok) return null;
	if (typeof response.data !== "object" || response.data === null) {
		throw new Error(`Expected JSON from ${url}`);
	}

	return response.data;
};
