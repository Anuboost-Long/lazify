import type { CustomRequest } from "../../custom-collections";
import type { RequestHeader } from "../../runner/types";
import type { SavedRoute } from "../../types";
import { redactBody } from "./redact";

/** The only way to get a single quote inside a single-quoted shell word. */
const ESCAPED_QUOTE = String.raw`'\''`;

function quoted(value: string): string {
	return `'${value.replace(/'/g, ESCAPED_QUOTE)}'`;
}

function line(parts: string[]): string {
	return parts.join(" \\\n  ");
}

export function curlFrom(
	method: string,
	url: string,
	headers: RequestHeader[],
	body: string | null,
): string {
	const parts = [`curl -X ${method} ${quoted(url)}`];

	for (const header of headers) {
		if (!header.name) continue;

		const pair = `${header.name}: ${header.value}`;

		parts.push(`-H ${quoted(pair)}`);
	}

	if (body?.trim()) parts.push(`-d ${quoted(body.trim())}`);

	return line(parts);
}

function securityHeaders(route: SavedRoute): RequestHeader[] {
	return route.security
		.filter((scheme) => scheme.location === "header")
		.map((scheme) => ({
			name: scheme.parameterName,
			value: scheme.kind === "bearer" ? "Bearer <token>" : `<${scheme.schemeName}>`,
		}));
}

function declaredHeaders(route: SavedRoute): RequestHeader[] {
	return route.headers.map((header) => ({
		name: header.name,
		value: header.value ?? `<${header.name.toLowerCase()}>`,
	}));
}

function sampleBody(request: CustomRequest): string | null {
	if (request.draft?.mode === "json" && request.draft.json.trim()) {
		return redactBody(request.draft.json);
	}

	const variant = request.route.requestBody?.variants?.[0];

	return variant?.defaultBody ?? variant?.example ?? null;
}

export function curlForRequest(request: CustomRequest, baseUrl: string): string {
	const route = request.route;
	const body = sampleBody(request);
	const headers = [...declaredHeaders(route), ...securityHeaders(route)];

	if (body?.trim() && !headers.some((header) => header.name.toLowerCase() === "content-type")) {
		const mediaType = route.requestBody?.variants?.[0]?.mediaType ?? "application/json";

		headers.push({ name: "Content-Type", value: mediaType });
	}

	return curlFrom(route.method, `${baseUrl.replace(/\/$/, "")}${route.path}`, headers, body);
}
