import fs from "node:fs/promises";

import { readCustomCollections } from "../custom-collections";
import type { CustomRequest } from "../custom-collections";
import { deriveEnvironmentVariables, withCustomVariables, withVariableNames } from "../environment";
import { readEnvironments } from "../environment-store";
import type { ProjectRequests, SavedRequest } from "../request-store";
import type { SavedRoute } from "../types";
import { buildPostmanCollection } from "./postman-collection";
import type { CollectionExport } from "./write-collection";

const EMPTY_DRAFT: Omit<SavedRequest, "examples"> = {
	mode: "json",
	json: "",
	entries: [],
	fields: {},
	scripts: { pre: "", post: "" },
	response: null,
	savedAt: new Date(0).toISOString(),
};

function asRoute(request: CustomRequest, folder: string): SavedRoute {
	return { ...request.route, id: request.id, folder, summary: request.name };
}

function asSavedRequest(request: CustomRequest): SavedRequest {
	return { ...EMPTY_DRAFT, ...request.draft, examples: request.examples };
}

export async function exportCustomCollection(
	projectPath: string,
	collectionId: string,
	filePath: string,
): Promise<CollectionExport | null> {
	const collection = readCustomCollections(projectPath).find(
		(candidate) => candidate.id === collectionId,
	);

	if (!collection) return null;

	const held: Array<{ request: CustomRequest; folder: string }> = [
		...collection.folders.flatMap((folder) =>
			folder.requests.map((request) => ({ request, folder: folder.name })),
		),
		...collection.requests.map((request) => ({ request, folder: collection.name })),
	];

	const routes = held.map(({ request, folder }) => asRoute(request, folder));
	const requests: ProjectRequests = Object.fromEntries(
		held.map(({ request }) => [request.id, asSavedRequest(request)]),
	);
	const environments = readEnvironments(projectPath);
	const active =
		environments.environments.find((one) => one.id === environments.activeId) ??
		environments.environments[0];

	const built = buildPostmanCollection(
		collection.name,
		routes,
		withVariableNames(
			withCustomVariables(deriveEnvironmentVariables(routes), environments.variables),
			environments.names,
		),
		active?.values ?? {},
		requests,
	);

	await fs.writeFile(filePath, `${JSON.stringify(built, null, 2)}\n`, "utf8");

	return { filePath, routes: routes.length };
}
