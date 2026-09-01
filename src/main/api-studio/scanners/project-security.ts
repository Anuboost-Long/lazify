import { environmentPolicy } from "../rules/environment-policy";
import type { GlobalSecurityRules } from "../rules/types";
import type { RouteSecurity, SecuritySchemeKind } from "../types";

const MAX_FILES = 200;

const DECLARED_KINDS: Record<string, SecuritySchemeKind> = {
	apikey: "apiKey",
	http: "bearer",
	bearer: "bearer",
	basic: "basic",
	jwt: "bearer",
	oauth2: "oauth2",
	openidconnect: "openIdConnect",
};

interface DeclaredScheme {
	id: string;
	kind: SecuritySchemeKind;
	parameterName: string;
	location: "header" | "query" | "cookie";
}

function firstGroup(text: string, patterns: RegExp[]): string | undefined {
	for (const pattern of patterns) {
		const found = pattern.exec(text);
		if (found?.[1]) return found[1];
	}

	return undefined;
}

function locationOf(declared: string | undefined) {
	const location = declared?.toLowerCase();

	return location === "query" || location === "cookie" ? location : "header";
}

/**
 * A scheme sending the token header is a bearer token however it was typed:
 * projects routinely declare JWT as an api key so their docs render a text box.
 */
function kindOf(declaredType: string | undefined, scheme: string | undefined, name: string) {
	const declared = DECLARED_KINDS[declaredType?.toLowerCase() ?? ""] ?? "apiKey";
	const written = DECLARED_KINDS[scheme?.toLowerCase() ?? ""];

	if (name.toLowerCase() === environmentPolicy.tokenHeader) return written ?? "bearer";
	if (declared === "bearer" && written) return written;

	return declared;
}

function readDefinitions(text: string, rules: GlobalSecurityRules): DeclaredScheme[] {
	const definitions: DeclaredScheme[] = [];

	for (const pattern of rules.definitions) {
		for (const declared of text.matchAll(pattern)) {
			const at = declared.index ?? 0;
			const block = text.slice(at, at + rules.definitionLength);
			const parameterName = firstGroup(block, rules.fields.parameterName);

			if (!parameterName) continue;

			definitions.push({
				id: declared.groups?.id ?? parameterName,
				kind: kindOf(
					firstGroup(block, rules.fields.type),
					firstGroup(block, rules.fields.scheme),
					parameterName,
				),
				parameterName,
				location: locationOf(firstGroup(block, rules.fields.location)),
			});
		}
	}

	return definitions;
}

function idsIn(text: string, patterns: RegExp[]): string[] {
	return patterns.flatMap((pattern) =>
		Array.from(text.matchAll(pattern), (match) => match.groups?.id ?? match[1]).filter(
			(id): id is string => Boolean(id),
		),
	);
}

function worthReading(lines: string[], hints: string[]) {
	return hints.some((hint) => lines.some((line) => line.includes(hint)));
}

interface ProjectDeclaration {
	schemes: DeclaredScheme[];
	required: Set<string>;
	guarded: boolean;
	guardName: string | null;
}

function read(sources: Array<{ lines: string[] }>, rules: GlobalSecurityRules): ProjectDeclaration {
	const declaration: ProjectDeclaration = {
		schemes: [],
		required: new Set<string>(),
		guarded: false,
		guardName: null,
	};

	let read = 0;

	for (const source of sources) {
		if (read >= MAX_FILES) break;
		if (!worthReading(source.lines, rules.hints)) continue;

		read += 1;

		const text = source.lines.join("\n");

		declaration.schemes.push(...readDefinitions(text, rules));
		for (const id of idsIn(text, rules.requirements)) declaration.required.add(id);
		declaration.guarded ||= rules.guards.some((pattern) => pattern.test(text));
		declaration.guardName ??= firstGroup(text, rules.guardNames) ?? null;
	}

	return declaration;
}

/**
 * A project that guards every route says so once, in its startup, its document
 * or its guard, never on the routes themselves. Only the kinds policy allows
 * project-wide are applied: a bearer token is reported per route by whatever
 * marks that route, and a scheme declared for a document's benefit alone is not
 * a requirement.
 */
export function readProjectSecurity(
	sources: Array<{ lines: string[] }>,
	rules: GlobalSecurityRules | null,
): RouteSecurity[] {
	if (!rules) return [];

	const declaration = read(sources, rules);
	const candidates = declaration.schemes.filter((scheme) =>
		environmentPolicy.projectWideKinds.includes(scheme.kind),
	);
	const named = candidates.filter((scheme) => declaration.required.has(scheme.id));
	const fallback = declaration.guarded ? candidates : [];
	const applied = named.length > 0 ? named : fallback;

	if (applied.length > 0) {
		return applied.map((scheme) => ({
			kind: scheme.kind,
			schemeName: scheme.id,
			location: scheme.location,
			parameterName: scheme.parameterName,
		}));
	}

	if (!declaration.guarded) return [];

	return [
		{
			kind: "apiKey",
			schemeName: "ApiKey",
			location: "header",
			parameterName: declaration.guardName ?? rules.guardParameterName,
		},
	];
}

/** Header names differing only in case are one header, so one requirement. */
export function mergeSecurity(
	fromProject: RouteSecurity[],
	fromRoute: RouteSecurity[],
): RouteSecurity[] {
	const merged = [...fromRoute, ...fromProject];
	const sameAs = (left: RouteSecurity, right: RouteSecurity) =>
		left.kind === right.kind &&
		left.location === right.location &&
		left.parameterName.toLowerCase() === right.parameterName.toLowerCase();

	return merged.filter(
		(security, at) => merged.findIndex((other) => sameAs(other, security)) === at,
	);
}
