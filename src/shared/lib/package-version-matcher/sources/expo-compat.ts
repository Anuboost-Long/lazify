import type { RegistryFetch } from "../registry";

const REGISTRY_BASE = "https://registry.npmjs.org";

interface ExpoPackageMeta {
  dependencies?: Record<string, string>;
}

/**
 * Fetches the expo package metadata for the installed SDK version and returns
 * its `dependencies` map — which Expo uses to pin compatible versions of all
 * expo-* and related packages.
 */
export async function fetchExpoCompatMap(
  registry: RegistryFetch,
  expoVersion: string
): Promise<Record<string, string>> {
  try {
    const data = (await registry(`${REGISTRY_BASE}/expo/${encodeURIComponent(expoVersion)}`, {
      accept: "application/json",
      timeoutMs: 12000
    })) as ExpoPackageMeta | null;

    if (!data) return {};

    return data.dependencies ?? {};
  } catch {
    return {};
  }
}
