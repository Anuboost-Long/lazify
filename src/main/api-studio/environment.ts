import { environmentPolicy } from "./rules/environment-policy";
import type { ApiRoute, ApiVariable, RouteSecurity } from "./types";

/** Everything the environment is derived from — a summary carries all of it. */
export type RouteEnvironmentSource = Pick<ApiRoute, "servers" | "security" | "headers">;

export const BASE_URL_VARIABLE = environmentPolicy.baseUrlVariable;

function camelCase(name: string) {
  const words = name
    .split(/[^A-Za-z0-9]+/)
    .filter((word) => word.length > 0)
    .map((word) => (word === word.toUpperCase() ? word.charAt(0) + word.slice(1).toLowerCase() : word));

  return words
    .map((word, index) =>
      index === 0
        ? word.charAt(0).toLowerCase() + word.slice(1)
        : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join("");
}

export function variableNameForSecurity(security: RouteSecurity): string {
  const rule = environmentPolicy.security[security.kind];

  return rule.nameFromParameter ? camelCase(security.parameterName) : (rule.variable ?? security.kind);
}

export function variableNameForHeader(headerName: string): string {
  return camelCase(headerName);
}

function upsert(
  variables: Map<string, ApiVariable>,
  variable: Omit<ApiVariable, "routeCount">
): void {
  const existing = variables.get(variable.name);

  if (existing) {
    existing.routeCount += 1;
    existing.defaultValue = existing.defaultValue ?? variable.defaultValue;
    return;
  }

  variables.set(variable.name, { ...variable, routeCount: 1 });
}

export function deriveEnvironmentVariables(routes: RouteEnvironmentSource[]): ApiVariable[] {
  const variables = new Map<string, ApiVariable>();

  for (const route of routes) {
    upsert(variables, {
      name: BASE_URL_VARIABLE,
      secret: false,
      location: "url",
      parameterName: null,
      defaultValue: route.servers[0] ?? null
    });

    for (const security of route.security) {
      upsert(variables, {
        name: variableNameForSecurity(security),
        secret: environmentPolicy.security[security.kind].secret,
        location: security.location,
        parameterName: security.parameterName,
        defaultValue: null
      });
    }

    for (const header of route.headers) {
      if (environmentPolicy.headers.onlyRequired && !header.required) continue;

      upsert(variables, {
        name: variableNameForHeader(header.name),
        secret: environmentPolicy.headers.secret,
        location: "header",
        parameterName: header.name,
        defaultValue: header.value
      });
    }
  }

  return Array.from(variables.values()).sort(
    (left, right) => right.routeCount - left.routeCount || left.name.localeCompare(right.name)
  );
}

export function variablesForRoute(route: RouteEnvironmentSource): string[] {
  return [
    BASE_URL_VARIABLE,
    ...route.security.map(variableNameForSecurity),
    ...route.headers
      .filter((header) => header.required || !environmentPolicy.headers.onlyRequired)
      .map((header) => variableNameForHeader(header.name))
  ];
}

export function resolveVariable(
  variables: ApiVariable[],
  values: Record<string, string>,
  name: string
): string | null {
  const value = values[name]?.trim();
  if (value) return value;

  return variables.find((variable) => variable.name === name)?.defaultValue ?? null;
}

export function requestUrlFor(
  route: Pick<ApiRoute, "path">,
  variables: ApiVariable[],
  values: Record<string, string>
): string {
  const baseUrl = resolveVariable(variables, values, BASE_URL_VARIABLE) ?? "";

  return `${baseUrl.replace(/\/+$/, "")}${route.path}`;
}
