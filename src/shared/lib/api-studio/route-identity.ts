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

/**
 * The webview has no `node:crypto`, and `SubtleCrypto.digest` is async-only —
 * this id only needs to be short and deterministic, never secret, so a
 * synchronous non-cryptographic 64-bit digest (two 32-bit FNV-1a lanes)
 * stands in for Electron's truncated SHA-1.
 */
function stableDigest(text: string): string {
	let hi = 0x811c9dc5;
	let lo = 0xc2b2ae35;

	for (let index = 0; index < text.length; index += 1) {
		const code = text.codePointAt(index) ?? 0;
		hi = Math.imul(hi ^ code, 0x01000193) >>> 0;
		lo = Math.imul(lo ^ code, 0x85ebca6b) >>> 0;
	}

	return hi.toString(16).padStart(8, "0") + lo.toString(16).padStart(8, "0");
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
