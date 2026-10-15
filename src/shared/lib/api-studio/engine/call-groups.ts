import { stringValue } from "../reading/annotations";
import type { CallRules } from "../rules/types";

function groupPattern(rules: CallRules) {
	if (rules.groupCalls.length === 0) return null;

	const keywords = rules.groups?.keywords ?? ["var", "const", "let", "RouteGroupBuilder"];
	const opening = keywords.length > 0 ? String.raw`(?:${keywords.join("|")})\s+` : "";

	return new RegExp(
		String.raw`${opening}(\w+)\s*=\s*(?:(\w+)\s*\.\s*)?(?:${rules.groupCalls.join("|")})\s*\(\s*([^)]*)`,
	);
}

function declaredPath(argument: string, rules: CallRules) {
	const named = rules.groups?.pathArgument ? rules.groups.pathArgument.exec(argument) : null;
	if (named?.[1]) return named[1];

	return stringValue(argument.split(",")[0]) ?? "";
}

/** Groups named once and reused: the prefix follows the name, not the line. */
export function readGroupPrefixes(lines: string[], rules: CallRules) {
	const pattern = groupPattern(rules);
	const declared = new Map<string, { parent: string; path: string }>();

	if (!pattern) return new Map<string, string>();

	for (const line of lines) {
		const match = pattern.exec(line);
		if (!match) continue;

		declared.set(match[1], { parent: match[2] ?? "", path: declaredPath(match[3], rules) });
	}

	const resolve = (name: string, seen: Set<string>): string => {
		const group = declared.get(name);
		if (!group || seen.has(name)) return "";

		seen.add(name);

		return `${resolve(group.parent, seen)}${group.path.replace(/(?<!\/)\/+$/, "")}`;
	};

	return new Map(
		Array.from(declared.keys()).map((name) => [name, resolve(name, new Set<string>())]),
	);
}

/** A mount such as `app.use("/api", router)` shifts every route the group declares. */
export function readMountPrefixes(lines: string[], rules: CallRules, groupNames: Set<string>) {
	const mounts = new Map<string, { prefix: string; overrides: boolean }>();
	const patterns =
		rules.mounts.length > 0
			? rules.mounts
			: [{ pattern: /\.\s*use\s*\(\s*(["'`][^"'`]*["'`])\s*,\s*(\w+)/, group: 2, path: 1 }];

	for (const line of lines) {
		for (const mount of patterns) {
			const match = mount.pattern.exec(line);
			if (!match) continue;

			const group = match[mount.group];
			const prefix = stringValue(match[mount.path]) ?? match[mount.path];

			if (group && prefix && groupNames.has(group)) {
				mounts.set(group, { prefix, overrides: mount.overrides === true });
			}
		}
	}

	return mounts;
}

export interface BlockScope {
	prefix: string;
	secured: boolean;
}

function capturedPrefix(line: string, openers: RegExp[]): string | null {
	for (const opener of openers) {
		const declared = opener.exec(line);
		const captured = declared?.slice(1).find((group) => group !== undefined);

		if (captured !== undefined) return captured;
	}

	return null;
}

/**
 * Groups opened as a block: `Route::prefix('v1')->group(function () {`. What the
 * block states belongs to every route until the braces that opened it close.
 */
export function readBlockScopes(lines: string[], rules: CallRules): BlockScope[] {
	if (!rules.blockGroups) return lines.map(() => ({ prefix: "", secured: false }));

	const { openers, authOpeners, open: openMark, close: closeMark } = rules.blockGroups;
	const open: Array<{ depth: number; path: string; secured: boolean }> = [];
	const scopes: BlockScope[] = [];
	let depth = 0;

	for (const line of lines) {
		scopes.push({
			prefix: open.map((group) => group.path).join(""),
			secured: open.some((group) => group.secured),
		});

		const opens = line.split(openMark).length - 1;
		const closes = line.split(closeMark).length - 1;
		const prefix = capturedPrefix(line, openers);
		const secured = authOpeners.some((opener) => opener.test(line));

		if (opens > 0 && (prefix !== null || secured)) {
			open.push({
				depth: depth + opens,
				path: prefix ? `/${prefix.replace(/^\/+|(?<!\/)\/+$/g, "")}` : "",
				secured,
			});
		}

		depth += opens - closes;

		while (open.length > 0 && depth < open[open.length - 1].depth) open.pop();
	}

	return scopes;
}
