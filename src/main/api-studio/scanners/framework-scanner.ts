import { flattenFormFields, readSerializationPolicy, templateFromModel } from "../body-template";
import type { ModelBodyOptions } from "../body-template";
import { readAnnotationRoutes } from "../engine/annotation-routes";
import { readCallRoutes } from "../engine/call-routes";
import type { FrameworkRouteDraft } from "../engine/route-drafts";
import { modelFromReturnType } from "../reading/return-types";
import { buildRouteId } from "../route-identity";
import type { FrameworkRules } from "../rules/types";
import { isFormMediaType } from "../runner/encode-body";
import type {
	ApiBody,
	ApiResponseDefinition,
	ApiRoute,
	RouteSecurity,
	ProjectInventory,
	RouteScanResult,
	RouteScanWarning,
	RouteScanner,
	ScannerEvidence,
	UnsupportedConstruct,
} from "../types";
import { expandQueryParameters, indexModelProperties, type ModelIndex } from "./model-index";
import { readProjectSecurity, mergeSecurity } from "./project-security";
import { readProjectServers } from "./project-servers";

/** A scoped inventory holds one project's files; they share its directory. */
function workspaceOf(project: ProjectInventory) {
	const [first] = project.files;
	if (!first || project.files.length === 0) return "";

	const directories = first.split("/").slice(0, -1);

	for (let depth = directories.length; depth > 0; depth -= 1) {
		const candidate = directories.slice(0, depth).join("/");

		if (project.files.every((file) => file.startsWith(`${candidate}/`))) return candidate;
	}

	return "";
}

function evidenceFor(project: ProjectInventory, framework: FrameworkRules): ScannerEvidence[] {
	const evidence: ScannerEvidence[] = [];

	if (framework.detect.stacks.includes(project.stack.stack)) {
		evidence.push({ kind: "stack", detail: `stack detected as ${project.stack.stack}` });
	}

	for (const dependency of framework.detect.dependencies) {
		if (project.hasDependency(dependency)) {
			evidence.push({ kind: "dependency", detail: `${dependency} dependency found` });
		}
	}

	const marker = framework.detect.files
		? project.files.find((file) => framework.detect.files!.test(file))
		: undefined;

	if (marker) evidence.push({ kind: "file", detail: marker });

	return evidence;
}

function sourceFiles(project: ProjectInventory, framework: FrameworkRules) {
	const { extensions, priorityNames, skipDirectories } = framework.sources;
	const candidates = project.files.filter(
		(file) =>
			extensions.some((extension) => file.toLowerCase().endsWith(extension)) &&
			!skipDirectories?.test(file),
	);

	if (!priorityNames) return candidates;

	return [
		...candidates.filter((file) => priorityNames.test(file)),
		...candidates.filter((file) => !priorityNames.test(file)),
	];
}

function asObject(body: string | null) {
	try {
		const parsed = body ? JSON.parse(body) : null;

		return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

/** A form binds a model and loose fields at once, and sends them together. */
function mergedBody(declared: string | null, fromModel: string | null) {
	const loose = asObject(declared);
	const model = asObject(fromModel);

	if (!loose || !model) return declared ?? fromModel;

	return JSON.stringify({ ...model, ...loose }, null, 2);
}

/**
 * A form binds by property name, and posts a flat set of them: the JSON naming
 * policy is not its business, and neither is nesting.
 */
function bodyFor(
	variant: ApiBody["variants"][number],
	models: ModelIndex,
	options: ModelBodyOptions,
) {
	const form = isFormMediaType(variant.mediaType);
	const fromModel = templateFromModel(
		models,
		form ? { ...options, naming: "pascal" } : options,
		variant.schemaType,
	);
	const merged = mergedBody(variant.defaultBody, fromModel);

	return form ? flattenFormFields(merged) : merged;
}

function withModelBody(
	models: ModelIndex,
	options: ModelBodyOptions,
	requestBody: ApiBody | null,
): ApiBody | null {
	if (!requestBody) return null;

	return {
		...requestBody,
		variants: requestBody.variants.map((variant) => ({
			...variant,
			defaultBody: bodyFor(variant, models, options),
		})),
	};
}

function returnedBody(
	draft: FrameworkRouteDraft,
	models: ModelIndex,
	options: ModelBodyOptions,
): string | null {
	const returned = modelFromReturnType(draft.returnType ?? null);

	if (!returned) return null;

	const template = templateFromModel(models, options, returned.model);

	if (!template) return null;
	if (!returned.collection) return template;

	try {
		return JSON.stringify([JSON.parse(template)], null, 2);
	} catch {
		return template;
	}
}

function responsesOf(
	draft: FrameworkRouteDraft,
	models: ModelIndex,
	options: ModelBodyOptions,
): ApiResponseDefinition[] {
	const body = returnedBody(draft, models, options);

	if (!body) return draft.responses;
	if (draft.responses.length === 0) {
		return [{ status: "200", description: null, mediaTypes: ["application/json"], example: body }];
	}

	return draft.responses.map((response) =>
		response.status.startsWith("2") && !response.example
			? { ...response, mediaTypes: ["application/json"], example: body }
			: response,
	);
}

/** What every route found in one file shares: where it was read and what it was read against. */
interface RouteContext {
	projectPath: string;
	filePath: string;
	servers: string[];
	projectSecurity: RouteSecurity[];
	adapter: string;
	models: ModelIndex;
	options: ModelBodyOptions;
}

function toApiRoute(draft: FrameworkRouteDraft, context: RouteContext): ApiRoute {
	const { projectPath, filePath, servers, projectSecurity, adapter, models, options } = context;

	return {
		id: buildRouteId(projectPath, draft.method, draft.path, filePath),
		projectPath,
		workspace: "",
		method: draft.method,
		path: draft.path,
		summary: draft.summary,
		description: null,
		operationId: null,
		tags: [],
		servers,
		source: {
			kind: "scanner",
			filePath,
			line: draft.line,
			adapter,
			confidence: draft.confidence,
		},
		parameters: draft.parameters,
		headers: draft.headers,
		requestBody: draft.requestBody,
		responses: responsesOf(draft, models, options),
		security: draft.anonymous ? [] : mergeSecurity(projectSecurity, draft.security),
	};
}

export function createFrameworkScanner(framework: FrameworkRules): RouteScanner {
	return {
		id: framework.id,
		label: framework.label,

		supports(project: ProjectInventory) {
			const evidence = evidenceFor(project, framework);
			const supported = evidence.length > 0 && sourceFiles(project, framework).length > 0;

			return { supported, confidence: supported ? 0.8 : 0, evidence };
		},

		async scan(project: ProjectInventory): Promise<RouteScanResult> {
			const startedAt = Date.now();
			const candidates = sourceFiles(project, framework);
			const inspected = candidates.slice(0, framework.sources.maxFiles);
			const servers = await readProjectServers(project, workspaceOf(project));
			const routes: ApiRoute[] = [];
			const warnings: RouteScanWarning[] = [];
			const unsupported: UnsupportedConstruct[] = [];

			if (candidates.length > inspected.length) {
				warnings.push({
					scanner: framework.id,
					message: `Only the first ${framework.sources.maxFiles} source files were read; ${candidates.length - inspected.length} were skipped.`,
					filePath: null,
					line: null,
				});
			}

			const sources: Array<{ filePath: string; lines: string[] }> = [];

			for (const filePath of inspected) {
				const content = await project.readFile(filePath).catch(() => null);
				if (content) sources.push({ filePath, lines: content.split(/\r?\n/) });
			}

			const sourceLines = sources.map((source) => source.lines);
			const models = indexModelProperties(sourceLines, framework);
			const projectSecurity = readProjectSecurity(sources, framework.globalSecurity);
			const bodyOptions: ModelBodyOptions = {
				types: framework.types,
				...readSerializationPolicy(sourceLines, framework.serialization),
			};

			for (const { filePath, lines } of sources) {
				if (!lines.some((line) => framework.sources.marker.test(line))) continue;

				const fromAnnotations = readAnnotationRoutes(lines, framework);
				const fromCalls = readCallRoutes(lines, framework);

				routes.push(
					...[...fromAnnotations.routes, ...fromCalls.routes].map((draft) =>
						toApiRoute(draft, {
							projectPath: project.projectPath,
							filePath,
							servers,
							projectSecurity,
							adapter: framework.id,
							models,
							options: bodyOptions,
						}),
					),
				);

				unsupported.push(
					...[...fromAnnotations.unsupported, ...fromCalls.unsupported].map((entry) => ({
						scanner: framework.id,
						reason: entry.reason,
						filePath,
						line: entry.line,
					})),
				);
			}

			return {
				projectPath: project.projectPath,
				routes: routes.map((route) => ({
					...route,
					parameters: expandQueryParameters(models, framework, route.parameters),
					requestBody: withModelBody(models, bodyOptions, route.requestBody),
				})),
				warnings,
				unsupported,
				filesInspected: inspected,
				scannersRun: [framework.id],
				durationMs: Date.now() - startedAt,
			};
		},
	};
}
