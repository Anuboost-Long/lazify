import { stableDigest } from "@/shared/lib/hash";

import type { HttpMethod } from "./types";

const PARAMETER_PATTERNS = [/^\{(.+)\}$/, /^:(.+)$/, /^\[\[?\.\.\.(.+?)\]?\]$/, /^\[(.+)\]$/];

function normalizeSegment(segment: string) {
	for (const pattern of PARAMETER_PATTERNS) {
		const match = pattern.exec(segment);
		if (match) return `{${match[1].trim()}}`;
	}

	return segment;
}

export function normalizeRoutePath(routePath: string): string {
	const withoutQuery = routePath.split(/[?#]/)[0];
	const segments = withoutQuery
		.split("/")
		.filter((segment) => segment.length > 0)
		.map(normalizeSegment);

	return `/${segments.join("/")}`;
}

export function routeIdentityKey(method: HttpMethod, routePath: string): string {
	return `${method} ${normalizeRoutePath(routePath)}`;
}

export function buildRouteId(
	projectPath: string,
	method: HttpMethod,
	routePath: string,
	sourceAnchor: string,
): string {
	const digest = stableDigest(
		[projectPath, routeIdentityKey(method, routePath), sourceAnchor].join("\u0000"),
	);

	return `route_${digest}`;
}
