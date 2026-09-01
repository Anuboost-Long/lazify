import fs from "node:fs";
import path from "node:path";

const STRIPPABLE = /\/\*[\s\S]*?\*\/|(^|[^:"'\\])\/\/[^\n]*/g;

function withoutComments(source: string): string {
	return source.replace(STRIPPABLE, (match, lead) => (lead === undefined ? "" : lead));
}

export function readAliasPrefixes(projectPath: string): string[] {
	const configFile = path.join(projectPath, "tsconfig.json");

	try {
		const parsed = JSON.parse(withoutComments(fs.readFileSync(configFile, "utf8"))) as {
			compilerOptions?: { paths?: Record<string, unknown> };
		};

		const paths = parsed.compilerOptions?.paths;
		if (!paths) return [];

		return Object.keys(paths)
			.map((pattern) => pattern.replace(/\*$/, ""))
			.filter((prefix) => prefix.length > 0 && !prefix.startsWith("."));
	} catch {
		return [];
	}
}
