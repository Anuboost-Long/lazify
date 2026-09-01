import type { PropertyNaming } from "../rules/types";

function words(name: string): string[] {
	return name
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
		.replace(/[_\- ]+/g, " ")
		.trim()
		.split(" ")
		.filter((word) => word.length > 0);
}

/** .NET lowercases the leading uppercase run, keeping the letter a word starts with. */
function camelCase(name: string): string {
	const run = /^[A-Z]+/.exec(name)?.[0];
	if (!run) return name;
	if (run.length === name.length) return name.toLowerCase();

	const kept = run.length > 1 && /[a-z]/.test(name[run.length]) ? 1 : 0;

	return name.slice(0, run.length - kept).toLowerCase() + name.slice(run.length - kept);
}

export function applyNaming(name: string, naming: PropertyNaming): string {
	switch (naming) {
		case "pascal":
			return name;
		case "camel":
			return camelCase(name);
		case "snake":
			return words(name).join("_").toLowerCase();
		case "snakeUpper":
			return words(name).join("_").toUpperCase();
		case "kebab":
			return words(name).join("-").toLowerCase();
	}
}
