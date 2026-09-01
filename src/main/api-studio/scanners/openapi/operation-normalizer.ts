import { buildRouteId } from "../../route-identity";
import type { ApiRoute, HttpMethod, RouteScanWarning, UnsupportedConstruct } from "../../types";
import type { OpenApiDocument } from "./document-parser";
import { normalizeParameters, normalizeRequestBody, normalizeResponses } from "./operation-fields";
import { isExternalReference, resolveRecord } from "./reference-resolver";
import { readOperationSecurity } from "./security";
import { findOperationLine } from "./source-locator";
import { asArray, asRecord, asText } from "./values";

const OPERATION_METHODS: Record<string, HttpMethod> = {
	get: "GET",
	post: "POST",
	put: "PUT",
	patch: "PATCH",
	delete: "DELETE",
	options: "OPTIONS",
	head: "HEAD",
};

export interface NormalizedDocument {
	routes: ApiRoute[];
	warnings: RouteScanWarning[];
	unsupported: UnsupportedConstruct[];
}

function serverUrls(nodes: unknown): string[] {
	return asArray(nodes)
		.map((node) => asText(asRecord(node)?.url))
		.filter((url): url is string => Boolean(url));
}

/** TRACE is the one non-method key worth reporting: a real operation this app will not send. */
function traceNotice(
	scannerId: string,
	document: OpenApiDocument,
	routePath: string,
	operationKey: string,
): UnsupportedConstruct[] {
	if (operationKey.toLowerCase() !== "trace") return [];

	return [
		{
			scanner: scannerId,
			reason: `${routePath} declares a TRACE operation, which API Studio does not send.`,
			filePath: document.relativePath,
			line: findOperationLine(document.rawText, routePath, operationKey),
		},
	];
}

export function normalizeOpenApiDocument(
	scannerId: string,
	projectPath: string,
	document: OpenApiDocument,
): NormalizedDocument {
	const content = document.content;
	const paths = asRecord(content.paths) ?? {};
	const documentServers = serverUrls(content.servers);
	const routes: ApiRoute[] = [];
	const warnings: RouteScanWarning[] = [];
	const unsupported: UnsupportedConstruct[] = [];

	for (const [routePath, rawPathItem] of Object.entries(paths)) {
		if (isExternalReference(rawPathItem)) {
			unsupported.push({
				scanner: scannerId,
				reason: `${routePath} points at an external document, which is not read yet.`,
				filePath: document.relativePath,
				line: findOperationLine(document.rawText, routePath, "$ref"),
			});
			continue;
		}

		const pathItem = resolveRecord(content, rawPathItem);

		if (!pathItem) {
			warnings.push({
				scanner: scannerId,
				message: `${routePath} could not be read as a path item.`,
				filePath: document.relativePath,
				line: findOperationLine(document.rawText, routePath, "get"),
			});
			continue;
		}

		const pathServers = serverUrls(pathItem.servers);
		const sharedParameters = asArray(pathItem.parameters);

		for (const [operationKey, rawOperation] of Object.entries(pathItem)) {
			const method = OPERATION_METHODS[operationKey.toLowerCase()];
			const operation = asRecord(rawOperation);

			if (!operation) continue;

			if (!method) {
				unsupported.push(...traceNotice(scannerId, document, routePath, operationKey));
				continue;
			}

			const line = findOperationLine(document.rawText, routePath, operationKey);
			const { parameters, headers } = normalizeParameters(content, [
				...sharedParameters,
				...asArray(operation.parameters),
			]);

			routes.push({
				id: buildRouteId(projectPath, method, routePath, document.relativePath),
				projectPath,
				workspace: "",
				method,
				path: routePath,
				summary: asText(operation.summary),
				description: asText(operation.description),
				operationId: asText(operation.operationId),
				tags: asArray(operation.tags)
					.map(asText)
					.filter((tag): tag is string => Boolean(tag)),
				servers: serverUrls(operation.servers).concat(pathServers, documentServers),
				source: {
					kind: "openapi",
					filePath: document.relativePath,
					line,
					adapter: scannerId,
					confidence: "exact",
				},
				parameters,
				headers,
				requestBody: normalizeRequestBody(content, operation.requestBody),
				responses: normalizeResponses(content, operation.responses),
				security: readOperationSecurity(content, operation),
			});
		}
	}

	return { routes, warnings, unsupported };
}
