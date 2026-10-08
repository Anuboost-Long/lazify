import { environmentPolicy } from "./rules/environment-policy";
import type { ApiRoute, ApiVariable, CustomVariable, RouteSecurity } from "./types";

/** Everything the environment is derived from — a summary carries all of it. */
export type RouteEnvironmentSource = Pick<ApiRoute, "servers" | "security" | "headers"> & {
	workspace?: string;
};

export const BASE_URL_VARIABLE = environmentPolicy.baseUrlVariable;

function camelCase(name: string) {
	const words = name
		.split(/[^A-Za-z0-9]+/)
		.filter((word) => word.length > 0)
		.map((word) =>
			word === word.toUpperCase() ? word.charAt(0) + word.slice(1).toLowerCase() : word,
		);

	return words
		.map((word, index) =>
			index === 0
				? word.charAt(0).toLowerCase() + word.slice(1)
				: word.charAt(0).toUpperCase() + word.slice(1),
		)
		.join("");
}

export function parameterNameForSecurity(security: RouteSecurity): string {
	return (
		security.parameterName.trim() ||
		(environmentPolicy.security[security.kind].defaultParameterName ?? "")
	);
}

export function variableNameForSecurity(security: RouteSecurity): string {
	return camelCase(parameterNameForSecurity(security)) || security.kind;
}

export function variableNameForHeader(headerName: string): string {
	return camelCase(headerName);
}

/**
 * One repository can serve several APIs on several ports, so the base URL is
 * named after the project that serves it. A repository that is one project
 * keeps the plain `baseUrl` it always had.
 */
export function baseUrlVariableFor(route: Pick<RouteEnvironmentSource, "workspace">): string {
	return route.workspace ? `${camelCase(route.workspace)}BaseUrl` : BASE_URL_VARIABLE;
}

function upsert(
	variables: Map<string, ApiVariable>,
	variable: Omit<ApiVariable, "routeCount" | "name">,
): void {
	const existing = variables.get(variable.key);

	if (existing) {
		existing.routeCount += 1;
		existing.defaultValue = existing.defaultValue ?? variable.defaultValue;
		return;
	}

	variables.set(variable.key, {
		...variable,
		name: variable.parameterName ?? variable.key,
		routeCount: 1,
	});
}

export function deriveEnvironmentVariables(routes: RouteEnvironmentSource[]): ApiVariable[] {
	const variables = new Map<string, ApiVariable>();

	for (const route of routes) {
		upsert(variables, {
			key: baseUrlVariableFor(route),
			secret: false,
			location: "url",
			parameterName: null,
			defaultValue: route.servers[0] ?? null,
			custom: false,
		});

		for (const security of route.security) {
			upsert(variables, {
				key: variableNameForSecurity(security),
				secret: environmentPolicy.security[security.kind].secret,
				location: security.location,
				parameterName: parameterNameForSecurity(security) || null,
				defaultValue: null,
				custom: false,
			});
		}

		for (const header of route.headers) {
			if (environmentPolicy.headers.onlyRequired && !header.required) continue;

			upsert(variables, {
				key: variableNameForHeader(header.name),
				secret: environmentPolicy.headers.secret,
				location: "header",
				parameterName: header.name,
				defaultValue: header.value,
				custom: false,
			});
		}
	}

	return Array.from(variables.values()).sort(
		(left, right) => right.routeCount - left.routeCount || left.name.localeCompare(right.name),
	);
}

/** The user's own variables ride along with every request in the collection. */
export function withCustomVariables(
	derived: ApiVariable[],
	custom: CustomVariable[],
): ApiVariable[] {
	const declared = new Set(derived.map((variable) => variable.key));

	return [
		...derived,
		...custom
			.filter((variable) => !declared.has(variable.key))
			.map((variable) => ({
				...variable,
				location: null,
				parameterName: null,
				defaultValue: null,
				routeCount: 0,
				custom: true,
			})),
	];
}

/** The name is the user's to choose; the key it binds to is not. */
export function withVariableNames(
	variables: ApiVariable[],
	names: Record<string, string> | undefined,
): ApiVariable[] {
	return variables.map((variable) => ({
		...variable,
		name: names?.[variable.key]?.trim() || variable.name || variable.key,
	}));
}

export function customVariableFor(key: string, name: string, secret = false): CustomVariable {
	return { key, name, secret };
}

/**
 * What a route needs, in the casing its own code uses — the label a user
 * reads, never the camelCased key those labels are stored under internally.
 * More than one scheme (bearer, oauth2, a project-wide policy…) routinely
 * names the same header, so names are deduped case-insensitively — one chip
 * per header, not one per scheme that happens to ride it.
 */
export function variablesForRoute(route: RouteEnvironmentSource): string[] {
	const names = [
		baseUrlVariableFor(route),
		...route.security.map(
			(security) => parameterNameForSecurity(security) || variableNameForSecurity(security),
		),
		...route.headers
			.filter((header) => header.required || !environmentPolicy.headers.onlyRequired)
			.map((header) => header.name),
	];

	const seen = new Set<string>();

	return names.filter((name) => {
		const lower = name.toLowerCase();
		if (seen.has(lower)) return false;
		seen.add(lower);
		return true;
	});
}

/**
 * Every name a `{{...}}` reference could resolve — one per variable, never
 * both its display name and its own storage key, which would offer the same
 * variable twice under two different spellings.
 */
export function suggestableVariableNames(
	variables: ApiVariable[],
	values: Record<string, string>,
): string[] {
	return [
		...variables.map((variable) => variable.name),
		...Object.keys(values).filter(
			(key) => !variables.some((variable) => variable.key === key || variable.name === key),
		),
	];
}

/** Callers hold either the key a route binds to or the name a user typed. */
export function resolveVariable(
	variables: ApiVariable[],
	values: Record<string, string>,
	nameOrKey: string,
): string | null {
	const variable = variables.find(
		(candidate) => candidate.key === nameOrKey || candidate.name === nameOrKey,
	);
	const value = (
		variable ? (values[variable.key] ?? values[variable.name]) : values[nameOrKey]
	)?.trim();

	if (value) return value;

	return variable?.defaultValue ?? null;
}
