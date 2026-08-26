import { sonarlint } from "./sonarlint";
import { tailwindcss } from "./tailwindcss";
import type { ExtensionProvider } from "./types";

export const PROVIDERS: readonly ExtensionProvider[] = [tailwindcss, sonarlint];

export const providerFor = (id: string): ExtensionProvider | null =>
	PROVIDERS.find((provider) => provider.entry.id === id) ?? null;

export { SONARLINT_MINIMUM_JAVA } from "./sonarlint";
export { MET, type ExtensionProvider, type ExtensionRequirement, type ServerLaunch } from "./types";
