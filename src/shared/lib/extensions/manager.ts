import { installPackage, packageFile, removePackage } from "@/platform/extension-packages";
import { deletePath } from "@/platform/folders";
import path from "@/shared/lib/path";

import { forgetJavaRuntime } from "./java-runtime";
import { extensionsRoot } from "./paths";
import { PROVIDERS, providerFor } from "./providers";
import { type DownloadReporter, fetchChecksum, fetchLatestRelease } from "./registry";
import { forgetInstall, installedExtension, rememberInstall, setExtensionEnabled } from "./store";
import type { ExtensionState, ExtensionStatus, InstallProgress, RegistryRelease } from "./types";

const listeners = new Set<(id: string) => void>();

export function onExtensionChanged(listener: (id: string) => void): () => void {
	listeners.add(listener);

	return () => listeners.delete(listener);
}

const announce = (id: string) => listeners.forEach((listener) => listener(id));

const latestCache = new Map<string, RegistryRelease | null>();

async function latestFor(namespace: string, name: string, refresh: boolean) {
	const key = `${namespace}.${name}`;

	if (!refresh && latestCache.has(key)) return latestCache.get(key) ?? null;

	try {
		const release = await fetchLatestRelease(namespace, name);

		latestCache.set(key, release);

		return release;
	} catch {
		return null;
	}
}

function statusOf(
	installedVersion: string | null,
	latest: RegistryRelease | null,
): ExtensionStatus {
	if (!installedVersion) return "not-installed";

	return latest && latest.version !== installedVersion ? "update-available" : "installed";
}

export async function listExtensions(refresh = false): Promise<ExtensionState[]> {
	/**
	 * A runtime found once is remembered for the session, which is wrong the
	 * moment someone installs the JRE an engine was waiting for. Checking again
	 * is the button that says so — it re-probes rather than repeating itself.
	 */
	if (refresh) forgetJavaRuntime();

	return Promise.all(
		PROVIDERS.map(async (provider) => {
			const { entry } = provider;
			const installed = await installedExtension(entry.id);
			const latest = await latestFor(entry.namespace, entry.name, refresh);

			return {
				entry,
				installed,
				latest,
				status: statusOf(installed?.version ?? null, latest),
				unreachable: latest === null,
				requirement: await provider.requirement(),
			};
		}),
	);
}

export type InstallReporter = (progress: InstallProgress) => void;

/** Chain package ids are lowercase letters, digits and dashes. */
const packageId = (id: string) => id.toLowerCase().replaceAll(".", "-");

const serverFile = (id: string, marker: string) => packageFile(packageId(id), `extension/${marker}`);

/** Chain reports no unpack stage of its own: the download's last byte starts it. */
async function downloadAndUnpack(
	id: string,
	release: RegistryRelease,
	onProgress: DownloadReporter,
	onUnpacking: () => void,
): Promise<void> {
	await installPackage(packageId(id), release.downloadUrl, await fetchChecksum(release), (received, total) => {
		onProgress(received, total);
		if (total !== null && received >= total) onUnpacking();
	});
}

export async function installExtension(
	id: string,
	report: InstallReporter = () => undefined,
): Promise<ExtensionState[]> {
	const provider = providerFor(id);

	if (!provider) throw new Error(`Unknown extension ${id}`);

	const release = await latestFor(provider.entry.namespace, provider.entry.name, true);

	if (!release) throw new Error(`${provider.entry.displayName} is not reachable on Open VSX`);

	await downloadAndUnpack(
		id,
		release,
		(receivedBytes, totalBytes) => report({ stage: "downloading", receivedBytes, totalBytes }),
		() => report({ stage: "unpacking" }),
	);

	if (!(await serverFile(id, provider.serverMarker))) {
		await removePackage(packageId(id));
		throw new Error(`${provider.entry.displayName} did not ship a language server`);
	}

	await rememberInstall(id, release.version);
	announce(id);

	return listExtensions();
}

export async function removeExtension(id: string): Promise<ExtensionState[]> {
	await removePackage(packageId(id));
	await deletePath(path.join(await extensionsRoot(), id));
	await forgetInstall(id);
	announce(id);

	return listExtensions();
}

export async function toggleExtension(id: string, enabled: boolean): Promise<ExtensionState[]> {
	await setExtensionEnabled(id, enabled);
	announce(id);

	return listExtensions();
}

export async function activeExtensionRoot(id: string): Promise<string | null> {
	const provider = providerFor(id);
	const installed = await installedExtension(id);

	if (!provider || !installed?.enabled || !(await provider.requirement()).satisfied) return null;

	const server = await serverFile(id, provider.serverMarker);

	return server ? server.slice(0, -provider.serverMarker.length - 1) : null;
}
