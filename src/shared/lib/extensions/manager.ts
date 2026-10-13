import { existingFiles } from "@/platform/exec";
import { deletePath } from "@/platform/folders";
import path from "@/shared/lib/path";

import { forgetJavaRuntime } from "./java-runtime";
import { extensionDir, extensionsRoot, unpackedDir } from "./paths";
import { PROVIDERS, providerFor } from "./providers";
import { type DownloadReporter, fetchLatestRelease } from "./registry";
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

const hasServer = async (root: string, marker: string) =>
	(await existingFiles([path.join(root, marker)])).size > 0;

/**
 * Streams the package to disk and unpacks it into `target`. Waits on Chain
 * request 17: the SonarLint package is 177 MB, which `desktop.http` would hold
 * in memory with no progress.
 */
async function downloadAndUnpack(
	_release: RegistryRelease,
	_target: string,
	_onProgress: DownloadReporter,
	_onUnpacking: () => void,
): Promise<void> {
	throw new Error("Installing extensions isn't available in Lazify Chain yet.");
}

export async function installExtension(
	id: string,
	report: InstallReporter = () => undefined,
): Promise<ExtensionState[]> {
	const provider = providerFor(id);

	if (!provider) throw new Error(`Unknown extension ${id}`);

	const release = await latestFor(provider.entry.namespace, provider.entry.name, true);

	if (!release) throw new Error(`${provider.entry.displayName} is not reachable on Open VSX`);

	const installRoot = path.join(await extensionsRoot(), id);

	await deletePath(installRoot);
	await downloadAndUnpack(
		release,
		await extensionDir(id, release.version),
		(receivedBytes, totalBytes) => report({ stage: "downloading", receivedBytes, totalBytes }),
		() => report({ stage: "unpacking" }),
	);

	if (!(await hasServer(await unpackedDir(id, release.version), provider.serverMarker))) {
		await deletePath(installRoot);
		throw new Error(`${provider.entry.displayName} did not ship a language server`);
	}

	await rememberInstall(id, release.version);
	announce(id);

	return listExtensions();
}

export async function removeExtension(id: string): Promise<ExtensionState[]> {
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

	const root = await unpackedDir(id, installed.version);

	return (await hasServer(root, provider.serverMarker)) ? root : null;
}
