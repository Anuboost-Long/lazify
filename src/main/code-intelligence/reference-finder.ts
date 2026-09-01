import fs from "node:fs/promises";
import path from "node:path";

import { attributeAt, importSpecifierOf, reExportSpecifierOf } from "./jsx-context";
import { findModuleDefinition } from "./module-resolver";
import { declarationLine, findSymbolDefinition, type SymbolDefinition } from "./symbol-finder";

/**
 * Go-to-definition that reads the click before it searches.
 *
 * The project-wide search is a good last resort and a poor first one: asked for
 * `onPress` it will happily land on whatever file happens to declare something
 * by that name. So a name written on a JSX element is resolved the way the
 * reader means it — follow the element's import to the component, then find the
 * prop in that component's own props — and when that cannot be followed, the
 * answer is nothing at all. A wrong file is worse than staying put.
 */

/** How many barrels to walk through before giving up on finding a component. */
const MAX_RE_EXPORT_HOPS = 3;

async function read(filePath: string): Promise<string | null> {
	try {
		return await fs.readFile(filePath, "utf8");
	} catch {
		return null;
	}
}

/**
 * A declaration this file actually makes, as opposed to one it only passes on.
 * `export { Button } from "./Button"` names Button without being where Button
 * is — following it is the whole point of walking barrels.
 */
function localDeclaration(source: string, name: string) {
	const found = declarationLine(source, name);
	if (!found) return null;

	const line = source.split("\n")[found.line - 1] ?? "";

	return /\bfrom\s*["']/.test(line) ? null : found;
}

function definitionAt(
	projectPath: string,
	filePath: string,
	line: number,
	kind: SymbolDefinition["kind"],
): SymbolDefinition {
	return {
		absolutePath: filePath,
		relativePath: path.relative(projectPath, filePath),
		line,
		kind,
	};
}

/**
 * What following a name's import led to.
 *
 * "outside" matters as much as "found": a component from node_modules has an
 * import that plainly says where it comes from, and answering that with some
 * same-named file elsewhere in the project is exactly the guess this exists to
 * avoid. Only "unknown" — no import to follow at all — leaves room for a search.
 */
type Trail =
	{ kind: "found"; filePath: string; source: string } | { kind: "outside" } | { kind: "unknown" };

/**
 * The file that declares `name`, reached by following this file's imports and
 * then as many re-exporting barrels as it takes.
 */
async function fileDeclaring(
	projectPath: string,
	fromPath: string,
	source: string,
	name: string,
): Promise<Trail> {
	let currentPath = fromPath;
	let currentSource = source;

	for (let hop = 0; hop <= MAX_RE_EXPORT_HOPS; hop += 1) {
		// Declared right here: the trail ends before it starts.
		if (localDeclaration(currentSource, name)) {
			return { kind: "found", filePath: currentPath, source: currentSource };
		}

		const specifier =
			hop === 0 ? importSpecifierOf(currentSource, name) : reExportSpecifierOf(currentSource, name);

		if (!specifier) return hop === 0 ? { kind: "unknown" } : { kind: "outside" };

		const module = await findModuleDefinition(projectPath, specifier, currentPath);
		if (!module) return { kind: "outside" };

		const next = await read(module.absolutePath);
		if (next === null) return { kind: "outside" };

		currentPath = module.absolutePath;
		currentSource = next;
	}

	return { kind: "outside" };
}

/** The props type a component's signature names, e.g. `PressableProps`. */
function propsTypeOf(source: string, component: string): string | null {
	const name = component.replace(/[$]/g, String.raw`\$&`);
	const patterns = [
		// function Button(props: ButtonProps) / function Button({ a }: ButtonProps)
		new RegExp(String.raw`function\s+${name}\s*\([\s\S]*?:\s*(?:Readonly<)?([A-Za-z_$][\w$]*)`),
		// const Button = ({ a }: ButtonProps) => / const Button: FC<ButtonProps> =
		new RegExp(
			String.raw`const\s+${name}\s*(?::[^=]*?<\s*([A-Za-z_$][\w$]*)|=[\s\S]{0,200}?:\s*(?:Readonly<)?([A-Za-z_$][\w$]*))`,
		),
	];

	for (const pattern of patterns) {
		const match = pattern.exec(source);
		if (match) return match[1] ?? match[2] ?? null;
	}

	return null;
}

/** The line a member is declared on inside a type or interface body. */
function memberLineIn(lines: string[], from: number, prop: string): number | null {
	const member = new RegExp(
		String.raw`^\s*(?:readonly\s+)?["']?${prop.replace(/[$]/g, String.raw`\$&`)}["']?\??\s*[:(<]`,
	);
	let depth = 0;

	for (let index = from; index < lines.length; index += 1) {
		const line = lines[index];

		if (depth > 0 && member.test(line)) return index + 1;

		depth += (line.match(/[{(]/g)?.length ?? 0) - (line.match(/[})]/g)?.length ?? 0);

		// Past the end of the body the answer is no longer in this declaration.
		if (index > from && depth <= 0) return null;
	}

	return null;
}

/** Where `prop` is declared for `component`, inside the file that declares it. */
function propLineIn(source: string, component: string, prop: string): number | null {
	const lines = source.split("\n");
	const typeName = propsTypeOf(source, component);

	if (typeName) {
		const declaration = new RegExp(
			String.raw`^\s*(?:export\s+)?(?:interface|type)\s+${typeName.replace(/[$]/g, String.raw`\$&`)}\b`,
		);
		const start = lines.findIndex((line) => declaration.test(line));

		if (start >= 0) {
			const found = memberLineIn(lines, start, prop);
			if (found) return found;
		}
	}

	// No named props type, or the prop is not in it: an inline `{ onPress }: {…}`
	// signature, or a props type built from others. The component's own file is
	// still the right file, so the prop is looked for anywhere a member is
	// declared in it.
	const member = new RegExp(
		String.raw`^\s*(?:readonly\s+)?["']?${prop.replace(/[$]/g, String.raw`\$&`)}["']?\??\s*[:(<]`,
	);
	const anywhere = lines.findIndex((line) => member.test(line));

	return anywhere >= 0 ? anywhere + 1 : null;
}

/**
 * A JSX prop: resolved through the component it is written on, or not at all.
 */
async function findPropDefinition(
	projectPath: string,
	fromPath: string,
	source: string,
	component: string,
	prop: string,
): Promise<SymbolDefinition | null> {
	// `Animated.View` is imported under its root name.
	const root = component.split(".")[0];
	const declaring = await fileDeclaring(projectPath, fromPath, source, root);

	// The component is not this project's to open — a package, most often. Its
	// props are wherever it lives, and that is not somewhere to guess at.
	if (declaring.kind !== "found") return null;

	const line =
		propLineIn(declaring.source, component.split(".").pop() ?? component, prop) ??
		declarationLine(declaring.source, root)?.line;

	return line ? definitionAt(projectPath, declaring.filePath, line, "declaration") : null;
}

/**
 * Where a name clicked in `fromPath` is defined.
 *
 * A JSX attribute is answered by its component and nothing else. Any other name
 * that this file imports is answered by following that import, which beats
 * ranking the whole project for a spelling. Only a name with no import behind it
 * falls through to the project-wide search.
 */
export async function findReferenceDefinition(
	projectPath: string,
	symbol: string,
	fromPath?: string | null,
	position?: { line: number; column: number } | null,
): Promise<SymbolDefinition | null> {
	const source = fromPath ? await read(fromPath) : null;

	if (fromPath && source && position) {
		const attribute = attributeAt(source, position.line, position.column);

		if (attribute?.prop === symbol) {
			return findPropDefinition(projectPath, fromPath, source, attribute.component, symbol);
		}
	}

	if (fromPath && source) {
		const declaring = await fileDeclaring(projectPath, fromPath, source, symbol);

		if (declaring.kind === "found") {
			const found = declarationLine(declaring.source, symbol);

			if (found) return definitionAt(projectPath, declaring.filePath, found.line, found.kind);
		}

		// Imported from outside the project: the file that has it is not one this
		// search could reach, so nothing is a better answer than something.
		if (declaring.kind === "outside") return null;
	}

	return findSymbolDefinition(projectPath, symbol);
}
