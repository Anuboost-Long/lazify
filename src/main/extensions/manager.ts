import fs from "node:fs";
import path from "node:path";

import { extractVsix } from "./archive";
import { forgetJavaRuntime } from "./java-runtime";
import { extensionDir, extensionsRoot, unpackedDir } from "./paths";
import { PROVIDERS, providerFor } from "./providers";
import { downloadRelease, fetchLatestRelease } from "./registry";
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
			const installed = installedExtension(entry.id);
			const latest = await latestFor(entry.namespace, entry.name, refresh);

			return {
				entry,
				installed,
				latest,
				status: statusOf(installed?.version ?? null, latest),
				unreachable: latest === null,
				requirement: provider.requirement(),
			};
		}),
	);
}

export type InstallReporter = (progress: InstallProgress) => void;

export async function installExtension(
	id: string,
	report: InstallReporter = () => undefined,
): Promise<ExtensionState[]> {
	const provider = providerFor(id);

	if (!provider) throw new Error(`Unknown extension ${id}`);

	const release = await latestFor(provider.entry.namespace, provider.entry.name, true);

	if (!release) throw new Error(`${provider.entry.displayName} is not reachable on Open VSX`);

	const archive = await downloadRelease(release, (receivedBytes, totalBytes) =>
		report({ stage: "downloading", receivedBytes, totalBytes }),
	);

	report({ stage: "unpacking" });

	fs.rmSync(path.join(extensionsRoot(), id), { recursive: true, force: true });
	await extractVsix(archive, extensionDir(id, release.version));

	if (!fs.existsSync(path.join(unpackedDir(id, release.version), provider.serverMarker))) {
		fs.rmSync(path.join(extensionsRoot(), id), { recursive: true, force: true });
		throw new Error(`${provider.entry.displayName} did not ship a language server`);
	}

	rememberInstall(id, release.version);
	announce(id);

	return listExtensions();
}

export async function removeExtension(id: string): Promise<ExtensionState[]> {
	fs.rmSync(path.join(extensionsRoot(), id), { recursive: true, force: true });
	forgetInstall(id);
	announce(id);

	return listExtensions();
}

export async function toggleExtension(id: string, enabled: boolean): Promise<ExtensionState[]> {
	setExtensionEnabled(id, enabled);
	announce(id);

	return listExtensions();
}

export function activeExtensionRoot(id: string): string | null {
	const provider = providerFor(id);
	const installed = installedExtension(id);

	if (!provider || !installed?.enabled || !provider.requirement().satisfied) return null;

	const root = unpackedDir(id, installed.version);

	return fs.existsSync(path.join(root, provider.serverMarker)) ? root : null;
}
