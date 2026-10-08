import { escapeRegex } from "./search-pattern";

export interface PathFilters {
	matchesInclude: (relativePath: string) => boolean;
	matchesExclude: (relativePath: string) => boolean;
}

function splitPatterns(value: string): string[] {
	const patterns: string[] = [];
	let current = "";
	let braceDepth = 0;

	for (const character of value) {
		if (character === "," && braceDepth === 0) {
			patterns.push(current);
			current = "";
			continue;
		}

		if (character === "{") braceDepth += 1;
		if (character === "}") braceDepth -= 1;
		current += character;
	}

	patterns.push(current);

	return patterns.map((pattern) => pattern.trim()).filter(Boolean);
}

function globToRegexSource(pattern: string): string {
	let source = "";

	for (let index = 0; index < pattern.length; index += 1) {
		const character = pattern[index];

		if (character === "*") {
			if (pattern[index + 1] !== "*") {
				source += "[^/]*";
				continue;
			}

			if (pattern[index + 2] === "/") {
				source += "(?:.*/)?";
				index += 2;
			} else {
				source += ".*";
				index += 1;
			}

			continue;
		}

		if (character === "?") {
			source += "[^/]";
			continue;
		}

		if (character === "{") {
			source += "(?:";
			continue;
		}

		if (character === "}") {
			source += ")";
			continue;
		}

		if (character === ",") {
			source += "|";
			continue;
		}

		source += escapeRegex(character);
	}

	return source;
}

function compileGlob(pattern: string): RegExp {
	const normalized = pattern.replace(/^\.?\//, "").replace(/\/+$/, "");
	const anchored = normalized.includes("/") ? normalized : `**/${normalized}`;

	return new RegExp(`^${globToRegexSource(anchored)}(?:/.*)?$`);
}

function compileAll(value: string): RegExp[] {
	return splitPatterns(value).flatMap((pattern) => {
		try {
			return [compileGlob(pattern)];
		} catch {
			return [];
		}
	});
}

export function compilePathFilters(include: string, exclude: string): PathFilters {
	const includes = compileAll(include);
	const excludes = compileAll(exclude);

	return {
		matchesInclude: (relativePath) =>
			includes.length === 0 || includes.some((matcher) => matcher.test(relativePath)),
		matchesExclude: (relativePath) => excludes.some((matcher) => matcher.test(relativePath)),
	};
}
