export {
	activeExtensionRoot,
	installExtension,
	listExtensions,
	onExtensionChanged,
	removeExtension,
	toggleExtension,
} from "./manager";
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
	RegistryRelease,
} from "./types";
