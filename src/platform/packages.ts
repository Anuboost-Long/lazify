import { matchPackageVersions as match } from "@/shared/lib/package-version-matcher/version-matcher";
import type { VersionMatchReport } from "@/shared/lib/package-version-matcher/types";

import { projectReader } from "./folders";
import { registryFetch } from "./registry";

export function matchPackageVersions(projectPath: string): Promise<VersionMatchReport> {
	return match({ projectPath, project: projectReader(projectPath), registry: registryFetch });
}
