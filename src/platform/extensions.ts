import {
	beginInstall,
	forgetInstallJob,
	installJobs,
	listExtensions as list,
	onInstallProgress,
	refreshWrittenManifests,
	removeExtension as remove,
	toggleExtension as toggle,
	writeProjectExtensionManifest,
} from "@/shared/lib/extensions";

export const listExtensions = (refresh?: boolean) => list(refresh === true);

/**
 * Answers with the job it started, not with the finished list: what follows is
 * tens of megabytes, and the window watches the progress events rather than
 * holding a promise open across a page change.
 */
export const installExtension = beginInstall;

export const extensionInstallJobs = async () => installJobs();

export async function removeExtension(id: string) {
	forgetInstallJob(id);

	const states = await remove(id);

	await refreshWrittenManifests();

	return states;
}

export async function toggleExtension(id: string, enabled: boolean) {
	const states = await toggle(id, enabled);

	await refreshWrittenManifests();

	return states;
}

export const writeExtensionManifest = writeProjectExtensionManifest;

export const onExtensionInstall = onInstallProgress;
