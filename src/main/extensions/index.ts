export {
	activeExtensionRoot,
	installExtension,
	listExtensions,
	onExtensionChanged,
	removeExtension,
	toggleExtension,
} from "./manager";
export {
	beginInstall,
	forgetInstallJob,
	installJobs,
	isInstalling,
	onInstallProgress,
} from "./install-jobs";
export { findJavaRuntime, forgetJavaRuntime, type JavaRuntime } from "./java-runtime";
export {
	projectManifestPath,
	refreshWrittenManifests,
	writeProjectExtensionManifest,
} from "./project-manifest";
export {
	PROVIDERS,
	providerFor,
	SONARLINT_MINIMUM_JAVA,
	type ExtensionProvider,
	type ExtensionRequirement,
	type ServerLaunch,
} from "./providers";
export type {
	ExtensionCatalogEntry,
	ExtensionState,
	ExtensionStatus,
	InstalledExtension,
	InstallJob,
	InstallStage,
	RegistryRelease,
} from "./types";
