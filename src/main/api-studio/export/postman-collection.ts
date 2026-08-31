import { baseUrlVariableFor, variableNameForHeader, variableNameForSecurity } from "../environment";
import type { SavedRequest } from "../request-store";
import { environmentPolicy } from "../rules/environment-policy";
import type { ApiVariable, SavedRoute } from "../types";

/**
 * Postman Collection v2.1.
 *
 * Everything the studio knows is expressed in Postman's own vocabulary rather
 * than exported as notes: a discovered variable becomes a collection variable,
 * a path placeholder becomes `:id`, a security scheme becomes the header it
 * actually sends, and a saved example becomes a saved response.
 */

const SCHEMA = "https://schema.getpostman.com/json/collection/v2.1.0/collection.json";

interface PostmanHeader {
	key: string;
	value: string;
	description?: string;
}

interface PostmanItem {
	name: string;
	request: {
		method: string;
		header: PostmanHeader[];
		url: {
			raw: string;
			host: string[];
			path: string[];
			query?: Array<{ key: string; value: string; description?: string; disabled?: boolean }>;
			variable?: Array<{ key: string; value: string; description?: string }>;
		};
		body?: { mode: "raw"; raw: string; options: { raw: { language: string } } };
		description?: string;
	};
	response: Array<{
		name: string;
		status: string;
		code: number;
		header: PostmanHeader[];
		body: string;
		_postman_previewlanguage?: string;
	}>;
}

export interface PostmanCollection {
	info: { name: string; schema: string; description?: string };
	variable: Array<{ key: string; value: string }>;
	item: Array<{ name: string; item: PostmanItem[] }>;
}

const reference = (name: string) => `{{${name}}}`;

/** Postman writes a path placeholder as `:id`, and names it in `url.variable`. */
function pathSegments(path: string) {
	return path
		.split("/")
		.filter((segment) => segment.length > 0)
		.map((segment) => segment.replace(/^\{(.+)\}$/, ":$1"));
}

function headersFor(route: SavedRoute): PostmanHeader[] {
	const headers: PostmanHeader[] = route.headers.map((header) => ({
		key: header.name,
		value: reference(variableNameForHeader(header.name)),
		description: header.description ?? undefined,
	}));

	for (const security of route.security) {
		const value = reference(variableNameForSecurity(security));
		const scheme = environmentPolicy.security[security.kind].authScheme;

		if (security.location !== "header") continue;

		headers.push({
			key: scheme ? "Authorization" : security.parameterName,
			value: scheme ? `${scheme} ${value}` : value,
		});
	}

	return headers;
}

function queryFor(route: SavedRoute) {
	return (route.parameters ?? [])
		.filter((parameter) => parameter.location === "query")
		.map((parameter) => ({
			key: parameter.name,
			value: parameter.example ?? "",
			description: parameter.description ?? undefined,
			disabled: !parameter.required,
		}));
}

function variablesFor(route: SavedRoute) {
	return (route.parameters ?? [])
		.filter((parameter) => parameter.location === "path")
		.map((parameter) => ({
			key: parameter.name,
			value: parameter.example ?? "",
			description: parameter.description ?? undefined,
		}));
}

function bodyFor(route: SavedRoute, saved: SavedRequest | undefined) {
	const declared = route.requestBody?.variants[0];
	const raw = saved?.json?.trim() || declared?.example || declared?.defaultBody;

	if (!raw) return undefined;

	return {
		mode: "raw" as const,
		raw,
		options: { raw: { language: declared?.mediaType.includes("json") === false ? "text" : "json" } },
	};
}

function responsesFor(saved: SavedRequest | undefined) {
	return (saved?.examples ?? []).map((example) => ({
		name: example.name,
		status: example.statusText,
		code: example.status,
		header: example.headers.map((header) => ({ key: header.name, value: header.value })),
		body: example.body,
		_postman_previewlanguage: example.mediaType?.includes("json") ? "json" : "text",
	}));
}

function itemFor(route: SavedRoute, saved: SavedRequest | undefined): PostmanItem {
	const segments = pathSegments(route.path);
	const query = queryFor(route);
	const enabled = query.filter((parameter) => !parameter.disabled);
	const search = enabled.map((parameter) => `${parameter.key}=${parameter.value}`).join("&");
	const baseUrl = reference(baseUrlVariableFor(route));
	const base = `${baseUrl}/${segments.join("/")}`;

	return {
		name: route.summary ?? `${route.method} ${route.path}`,
		request: {
			method: route.method,
			header: headersFor(route),
			url: {
				raw: search ? `${base}?${search}` : base,
				host: [baseUrl],
				path: segments,
				...(query.length > 0 ? { query } : {}),
				...(segments.some((segment) => segment.startsWith(":"))
					? { variable: variablesFor(route) }
					: {}),
			},
			body: bodyFor(route, saved),
			description: route.description ?? undefined,
		},
		response: responsesFor(saved),
	};
}

export function buildPostmanCollection(
	name: string,
	routes: SavedRoute[],
	variables: ApiVariable[],
	values: Record<string, string>,
	requests: Record<string, SavedRequest> = {},
): PostmanCollection {
	const folders = new Map<string, PostmanItem[]>();

	for (const route of routes) {
		const folder = route.folder || "/";

		folders.set(folder, [...(folders.get(folder) ?? []), itemFor(route, requests[route.id])]);
	}

	return {
		info: { name, schema: SCHEMA },
		/** A secret keeps its name and loses its value: an export is a shareable file. */
		variable: variables.map((variable) => ({
			key: variable.key,
			value: variable.secret
				? ""
				: (values[variable.key] ?? values[variable.name] ?? variable.defaultValue ?? ""),
		})),
		item: Array.from(folders, ([folder, items]) => ({ name: folder, item: items })),
	};
}
