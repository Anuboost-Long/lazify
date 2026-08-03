import type { PackageOption } from "@renderer/shared/types/lazify";
import type { TemplatePackageEntry } from "../../../../../main/scaffolding/template-package-manifest";
import type { TemplatePackagePreview } from "./types";

export function parsePackageNames(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getFallbackPackageOption(packageName: string): PackageOption {
  return {
    name: packageName,
    version: "",
    description: "",
    keywords: [],
    publisher: null
  };
}

export async function resolveTemplatePackagePreviews(
  manifestPackages: TemplatePackageEntry[]
): Promise<TemplatePackagePreview[]> {
  return Promise.all(
    manifestPackages.map(async (entry) => {
      try {
        const matches = await globalThis.lazify.searchNpmPackages(entry.name);
        const exactMatch = matches.find((pkg) => pkg.name === entry.name);
        const pkg = exactMatch ?? getFallbackPackageOption(entry.name);

        return { ...pkg, requestedVersion: entry.version };
      } catch {
        return {
          ...getFallbackPackageOption(entry.name),
          description: "Package metadata is unavailable right now, but this dependency is still listed in the template manifest.",
          requestedVersion: entry.version
        };
      }
    })
  );
}
