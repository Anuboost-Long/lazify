export const sep = "/";

function normalizeSegments(path: string, allowAboveRoot: boolean): string {
	const segments: string[] = [];

	for (const segment of path.split("/")) {
		if (segment === "" || segment === ".") continue;

		if (segment === "..") {
			if (segments.length > 0 && segments.at(-1) !== "..") segments.pop();
			else if (allowAboveRoot) segments.push("..");
			continue;
		}

		segments.push(segment);
	}

	return segments.join("/");
}

export function isAbsolute(path: string): boolean {
	return path.startsWith("/");
}

export function normalize(path: string): string {
	if (path === "") return ".";

	const absolute = isAbsolute(path);
	const trailing = path.endsWith("/");
	let normalized = normalizeSegments(path, !absolute);

	if (normalized === "" && !absolute) normalized = ".";
	if (normalized !== "" && trailing) normalized += "/";

	return absolute ? `/${normalized}` : normalized;
}

export function join(...paths: string[]): string {
	const joined = paths.filter((part) => part !== "").join("/");

	return joined === "" ? "." : normalize(joined);
}

export function resolve(...paths: string[]): string {
	let resolved = "";

	for (let index = paths.length - 1; index >= 0 && !isAbsolute(resolved); index -= 1) {
		const part = paths[index];
		if (part === "") continue;
		resolved = resolved === "" ? part : `${part}/${resolved}`;
	}

	const normalized = normalizeSegments(resolved, false);

	return `/${normalized}`;
}

export function relative(from: string, to: string): string {
	const fromParts = resolve(from).split("/").filter(Boolean);
	const toParts = resolve(to).split("/").filter(Boolean);
	let shared = 0;

	while (shared < fromParts.length && shared < toParts.length && fromParts[shared] === toParts[shared]) {
		shared += 1;
	}

	return [...fromParts.slice(shared).map(() => ".."), ...toParts.slice(shared)].join("/");
}

function withoutTrailingSlashes(path: string): string {
	let end = path.length;
	while (end > 1 && path[end - 1] === "/") end -= 1;

	return path.slice(0, end);
}

export function basename(path: string, suffix?: string): string {
	const trimmed = withoutTrailingSlashes(path);
	const name = trimmed === "/" ? "" : trimmed.slice(trimmed.lastIndexOf("/") + 1);

	return suffix && name !== suffix && name.endsWith(suffix) ? name.slice(0, -suffix.length) : name;
}

export function dirname(path: string): string {
	if (path === "") return ".";

	const trimmed = withoutTrailingSlashes(path);
	if (trimmed === "/") return "/";

	const index = trimmed.lastIndexOf("/");
	if (index === -1) return ".";
	if (index === 0) return "/";

	return trimmed.slice(0, index);
}

export function extname(path: string): string {
	const name = basename(path);
	const dot = name.lastIndexOf(".");

	return dot > 0 && name !== ".." ? name.slice(dot) : "";
}

export const posix = { sep, isAbsolute, normalize, join, resolve, relative, basename, dirname, extname };

export default { ...posix, posix };
