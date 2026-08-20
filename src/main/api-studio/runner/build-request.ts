import {
  baseUrlVariableFor,
  resolveVariable,
  variableNameForHeader,
  variableNameForSecurity
} from "../environment";
import { environmentPolicy } from "../rules/environment-policy";
import type { ApiHeader, ApiVariable, SavedRoute } from "../types";
import { encodeBody, MULTIPART_MEDIA_TYPE } from "./encode-body";
import { interpolate } from "./interpolate";
import type {
  ApiRequestDraft,
  RequestBodyInput,
  RequestFieldLocation,
  RequestHeader
} from "./types";

export type RequestRoute = Pick<SavedRoute, "method" | "path" | "headers" | "security"> &
  Partial<Pick<SavedRoute, "parameters" | "requestBody" | "workspace">>;

export interface RequestDraftInput {
  route: RequestRoute;
  variables: ApiVariable[];
  values: Record<string, string>;
  fields: Record<string, string>;
  body: RequestBodyInput | null;
}

interface AppliedValue {
  location: "header" | "query" | "cookie";
  parameterName: string;
  authScheme: string | null;
  value: string;
}

const PATH_PLACEHOLDER = /\{([^}]+)\}/g;
const BODYLESS_METHODS = new Set(["GET", "HEAD"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]", "::1"]);

export function fieldKey(location: RequestFieldLocation, name: string): string {
  return `${location}:${name}`;
}

/** A field may be given more than once: the repeats carry `#2`, `#3`, … */
export function fieldNameOf(key: string, location: RequestFieldLocation): string {
  return key.slice(location.length + 1).replace(/#\d+$/, "");
}

export function repeatKey(key: string, taken: Iterable<string>): string {
  const held = new Set(taken);
  const base = key.replace(/#\d+$/, "");

  for (let index = 2; ; index += 1) {
    const next = `${base}#${index}`;

    if (!held.has(next)) return next;
  }
}

function keysFor(
  fields: Record<string, string>,
  location: RequestFieldLocation,
  name: string
): string[] {
  const base = fieldKey(location, name);

  return Object.keys(fields)
    .filter((key) => key === base || key.startsWith(`${base}#`))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
}

function entered(input: RequestDraftInput, location: RequestFieldLocation, name: string): string {
  return enteredAll(input, location, name)[0] ?? "";
}

/** Every value given for one field, in the order the rows were added. */
function enteredAll(
  input: RequestDraftInput,
  location: RequestFieldLocation,
  name: string
): string[] {
  return keysFor(input.fields, location, name)
    .map((key) => input.fields[key]?.trim())
    .filter((value): value is string => Boolean(value))
    .map((value) => interpolate(value, input.variables, input.values));
}

function securityValues(input: RequestDraftInput): AppliedValue[] {
  return input.route.security.flatMap((security) => {
    const value = resolveVariable(
      input.variables,
      input.values,
      variableNameForSecurity(security)
    );

    if (!value) return [];

    return [
      {
        location: security.location,
        parameterName: security.parameterName,
        authScheme: environmentPolicy.security[security.kind].authScheme,
        value
      }
    ];
  });
}

function headerValue(input: RequestDraftInput, header: ApiHeader): string {
  const typed = entered(input, "header", header.name);
  if (typed) return typed;

  const fromEnvironment = resolveVariable(
    input.variables,
    input.values,
    variableNameForHeader(header.name)
  );

  return fromEnvironment ?? header.value ?? "";
}

function withScheme(scheme: string, value: string) {
  return value.toLowerCase().startsWith(`${scheme.toLowerCase()} `) ? value : `${scheme} ${value}`;
}

/** Rows the user added themselves, keyed the way a declared field is. */
export function addedFields(
  input: Pick<RequestDraftInput, "route" | "fields">,
  location: RequestFieldLocation
): Array<{ key: string; name: string; value: string }> {
  const declared = new Set(
    location === "header"
      ? input.route.headers.map((header) => header.name)
      : (input.route.parameters ?? [])
          .filter((parameter) => parameter.location === location)
          .map((parameter) => parameter.name)
  );

  return Object.entries(input.fields)
    .filter(([key]) => key.startsWith(`${location}:`))
    .map(([key, value]) => ({ key, name: fieldNameOf(key, location), value }))
    .filter((field) => field.name.length > 0 && !declared.has(field.name));
}

function requestHeaders(input: RequestDraftInput, security: AppliedValue[]): RequestHeader[] {
  const headers: RequestHeader[] = [
    ...input.route.headers.map((header) => ({
      name: header.name,
      value: headerValue(input, header)
    })),
    ...addedFields(input, "header").map((field) => ({
      name: field.name,
      value: interpolate(field.value, input.variables, input.values)
    }))
  ].filter((header) => header.value.length > 0);

  for (const item of security) {
    if (item.location !== "header") continue;

    headers.push(
      item.authScheme
        ? { name: "Authorization", value: withScheme(item.authScheme, item.value) }
        : { name: item.parameterName, value: item.value }
    );
  }

  const cookie = cookieHeader(input, security);
  if (cookie) headers.push({ name: "Cookie", value: cookie });

  return headers;
}

function cookieHeader(input: RequestDraftInput, security: AppliedValue[]): string {
  const cookies = (input.route.parameters ?? [])
    .filter((parameter) => parameter.location === "cookie")
    .map((parameter) => [parameter.name, entered(input, "cookie", parameter.name)] as const)
    .filter(([, value]) => value.length > 0);

  const fromSecurity = security
    .filter((item) => item.location === "cookie")
    .map((item) => [item.parameterName, item.value] as const);

  return [...cookies, ...fromSecurity]
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join("; ");
}

function pathWithValues(input: RequestDraftInput): string {
  return input.route.path.replace(PATH_PLACEHOLDER, (token, name: string) => {
    const value = entered(input, "path", name);

    return value ? encodeURIComponent(value) : token;
  });
}

function queryString(input: RequestDraftInput, security: AppliedValue[]): string {
  const query = new URLSearchParams();

  for (const parameter of input.route.parameters ?? []) {
    if (parameter.location !== "query") continue;

    for (const value of enteredAll(input, "query", parameter.name)) {
      query.append(parameter.name, value);
    }
  }

  for (const field of addedFields(input, "query")) {
    const value = interpolate(field.value.trim(), input.variables, input.values);

    if (value) query.append(field.name, value);
  }

  for (const item of security) {
    if (item.location === "query") query.set(item.parameterName, item.value);
  }

  const search = query.toString();

  return search ? `?${search}` : "";
}

function jsonMediaType(route: RequestRoute): string {
  const declared = route.requestBody?.variants[0]?.mediaType;

  return declared?.includes("json") ? declared : "application/json";
}

function encodedBody(input: RequestDraftInput) {
  if (!input.body || BODYLESS_METHODS.has(input.route.method)) return null;

  return encodeBody(input.body, jsonMediaType(input.route), input.variables, input.values);
}

function contentTypeHeader(headers: RequestHeader[]): RequestHeader | undefined {
  return headers.find((header) => header.name.toLowerCase() === "content-type");
}

export function buildRequest(input: RequestDraftInput): ApiRequestDraft {
  const security = securityValues(input);
  const headers = requestHeaders(input, security);
  const body = encodedBody(input);
  const baseUrl =
    resolveVariable(input.variables, input.values, baseUrlVariableFor(input.route)) ?? "";
  const declared = body ? contentTypeHeader(headers) : undefined;

  if (body && !declared) headers.push({ name: "Content-Type", value: body.mediaType });
  if (declared && body?.mediaType.startsWith(MULTIPART_MEDIA_TYPE)) declared.value = body.mediaType;

  return {
    method: input.route.method,
    url: `${baseUrl.replace(/\/+$/, "")}${pathWithValues(input)}${queryString(input, security)}`,
    headers,
    body: body?.parts ? null : (body?.text ?? null),
    ...(body?.parts ? { multipart: body.parts } : {})
  };
}

export function hostOf(url: string): string | null {
  try {
    return new URL(url).host || null;
  } catch {
    return null;
  }
}

export function isLocalUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);

    return LOCAL_HOSTS.has(hostname) || hostname.endsWith(".localhost");
  } catch {
    return false;
  }
}
