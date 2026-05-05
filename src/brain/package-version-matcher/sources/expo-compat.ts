const REGISTRY_BASE = "https://registry.npmjs.org";

interface ExpoPackageMeta {
  dependencies?: Record<string, string>;
}

/**
 * Fetches the expo package metadata for the installed SDK version and returns
 * its `dependencies` map — which Expo uses to pin compatible versions of all
 * expo-* and related packages.
 */
export async function fetchExpoCompatMap(expoVersion: string): Promise<Record<string, string>> {
  try {
    const response = await fetch(`${REGISTRY_BASE}/expo/${encodeURIComponent(expoVersion)}`, {
      headers: { Accept: "application/json", "User-Agent": "lazify/0.1.0" },
      signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) return {};

    const data = (await response.json()) as ExpoPackageMeta;
    return data.dependencies ?? {};
  } catch {
    return {};
  }
}
