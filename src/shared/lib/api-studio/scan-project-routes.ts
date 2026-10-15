import { createProjectInventory } from "./project-inventory";
import { routeIdentityKey } from "./route-identity";
import { routeScanners } from "./scanners";
import type {
	ApiRoute,
	ProjectInventory,
	RouteScanResult,
	RouteScanWarning,
	UnsupportedConstruct,
} from "./types";
import { findWorkspaces, inventoryOf } from "./workspaces";

function dedupeRoutes(routes: ApiRoute[]): ApiRoute[] {
	const byIdentity = new Map<string, ApiRoute>();

	for (const route of routes) {
		/** Two services may both serve `/health`: the workspace tells them apart. */
		const key = `${route.workspace}\u0000${routeIdentityKey(route.method, route.path)}`;
		if (!byIdentity.has(key)) byIdentity.set(key, route);
	}

	const order = (left: string, right: string) => {
		if (left < right) return -1;

		return left > right ? 1 : 0;
	};

	return Array.from(byIdentity.values()).sort(
		(left, right) => order(left.path, right.path) || order(left.method, right.method),
	);
}

async function runScanners(project: ProjectInventory) {
	const routes: ApiRoute[] = [];
	const warnings: RouteScanWarning[] = [];
	const unsupported: UnsupportedConstruct[] = [];
	const filesInspected: string[] = [];
	const scannersRun: string[] = [];

	for (const scanner of routeScanners) {
		const support = await scanner.supports(project);
		if (!support.supported) continue;

		const result = await scanner.scan(project);

		routes.push(...result.routes);
		warnings.push(...result.warnings);
		unsupported.push(...result.unsupported);
		filesInspected.push(...result.filesInspected);
		scannersRun.push(scanner.id);
	}

	return { routes, warnings, unsupported, filesInspected, scannersRun };
}

/** One repository, one project per workspace, scanned as the projects they are. */
async function runWorkspaces(project: ProjectInventory) {
	const collected = {
		routes: [] as ApiRoute[],
		warnings: [] as RouteScanWarning[],
		unsupported: [] as UnsupportedConstruct[],
		filesInspected: [] as string[],
		scannersRun: [] as string[],
	};

	const workspaces = findWorkspaces(project);

	for (const workspace of workspaces) {
		const scanned = await runScanners(inventoryOf(project, workspace, workspaces));

		collected.routes.push(...scanned.routes.map((route) => ({ ...route, workspace })));
		collected.warnings.push(...scanned.warnings);
		collected.unsupported.push(...scanned.unsupported);
		collected.filesInspected.push(...scanned.filesInspected);
		collected.scannersRun.push(
			...scanned.scannersRun.filter((id) => !collected.scannersRun.includes(id)),
		);
	}

	return collected;
}

export async function scanProjectRoutes(projectPath: string): Promise<RouteScanResult> {
	const startedAt = Date.now();
	const project = await createProjectInventory(projectPath);
	const collected = await runWorkspaces(project);

	if (project.filesTruncated) {
		collected.warnings.push({
			scanner: "api-studio",
			message: "This project has more files than one scan reads, so some sources were skipped.",
			filePath: null,
			line: null,
		});
	}

	if (collected.scannersRun.length === 0) {
		collected.warnings.push({
			scanner: "api-studio",
			message: "No API description or supported framework was found in this project.",
			filePath: null,
			line: null,
		});
	}

	return {
		projectPath: project.projectPath,
		routes: dedupeRoutes(collected.routes),
		warnings: collected.warnings,
		unsupported: collected.unsupported,
		filesInspected: collected.filesInspected,
		scannersRun: collected.scannersRun,
		durationMs: Date.now() - startedAt,
	};
}
