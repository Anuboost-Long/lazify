import { schemaTypeOf } from "../engine/parameter-binding";
import { readBaseTypes, readClassName } from "../reading/declarations";
import type { FrameworkRules } from "../rules/types";
import type { ApiParameter } from "../types";

const CSHARP_MODIFIERS = String.raw`(?:required|virtual|override|static|readonly|new|abstract|sealed|const|async)\s+`;
const PROPERTY_PATTERNS = [
	new RegExp(
		String.raw`\bpublic\s+(?:${CSHARP_MODIFIERS})*([\w<>,.[\]?]+)\s+(\w+)\s*(?:\{|=>|=[^=]|;)`,
	),
	/^\s*(?:readonly\s+)?(\w+)\??\s*:([\w<>[\]| ]+);/,
	/^\s*(?:public|protected|private)\s+(?:readonly\s+)?\??([\w|\\]+)\s+\$(\w+)\s*[;=]/,
	/^\s*(\w+)\s*:([\w[\], |.]+)(?:=.*)?$/,
];
const ENUM_PATTERN = /\benum\s+(\w+)/;
/** `Active` or `Active,` — a member that lets the language number it. */
const ENUM_MEMBER_PATTERN = /^\s*([A-Za-z_]\w*)(?:\s*,)?\s*$/;
/** `Active = 1,` or `Active = "active",` — the value is read from the tail. */
const ENUM_VALUE_PATTERN = /^\s*([A-Za-z_]\w*)\s*=(.+)$/;
const ENUM_NUMBER = /^(-?\d+|0[xX][0-9a-fA-F]+)$/;
const ENUM_TEXT = /^['"]([^'"]*)['"]$/;

interface ModelProperty {
	name: string;
	type: string;
	jsonName: string | null;
}

export interface EnumMember {
	name: string;
	value: number | null;
	/** A backed enum states what goes on the wire, whatever its member is called. */
	text: string | null;
}

export interface ModelEntry {
	properties: ModelProperty[];
	baseTypes: string[];
	enumMembers: EnumMember[] | null;
}

export type ModelIndex = Map<string, ModelEntry>;

const IGNORED_PROPERTY_NAMES = new Set(["class", "return", "if", "else", "import", "from", "def"]);

/** C# and PHP name the type first, TypeScript and Python name it second. */
function readProperty(line: string): Omit<ModelProperty, "jsonName"> | null {
	const declared = PROPERTY_PATTERNS[0].exec(line);
	if (declared) return { type: declared[1], name: declared[2] };

	const php = PROPERTY_PATTERNS[2].exec(line);
	if (php) return { type: php[1].replace(/^\\/, ""), name: php[2] };

	const typed = PROPERTY_PATTERNS[1].exec(line) ?? PROPERTY_PATTERNS[3].exec(line);
	if (typed && !IGNORED_PROPERTY_NAMES.has(typed[1])) {
		return { type: typed[2].trim(), name: typed[1] };
	}

	return null;
}

function readJsonName(line: string, annotations: string[]): string | null {
	for (const annotation of annotations) {
		const named = new RegExp(String.raw`${annotation}\s*\(\s*"([^"]+)"`).exec(line);
		if (named) return named[1];
	}

	return null;
}

/** `public record LoginRequest(string Username, string Password);` */
function readPositionalProperties(line: string): Array<Omit<ModelProperty, "jsonName">> {
	const open = line.indexOf("(");
	if (open === -1) return [];

	const parameters = line.slice(open + 1).split(")")[0];

	return parameters
		.split(",")
		.map((parameter) =>
			parameter
				.replace(/[[^]*\]/g, "")
				.split("=")[0]
				.trim(),
		)
		.map((parameter) => parameter.split(/\s+/).filter(Boolean))
		.filter((parts) => parts.length >= 2)
		.map((parts) => ({ type: parts[parts.length - 2], name: parts[parts.length - 1] }));
}

function readEnumMember(line: string): EnumMember | null {
	const text = line.split("//")[0];
	const valued = ENUM_VALUE_PATTERN.exec(text);

	if (valued) {
		const raw = valued[2].trim().replace(/,$/, "").trim();
		const number = ENUM_NUMBER.exec(raw);
		const quoted = ENUM_TEXT.exec(raw);

		/** A value this scan cannot read is not a member it can describe. */
		if (!number && !quoted) return null;

		return { name: valued[1], value: number ? Number(number[1]) : null, text: quoted?.[1] ?? null };
	}

	const member = ENUM_MEMBER_PATTERN.exec(text);

	return member ? { name: member[1], value: null, text: null } : null;
}

/** `enum Status { Unknown = 0, Active = 1 }` states its members on its own line. */
function readInlineMembers(line: string): EnumMember[] {
	const body = line.slice(line.indexOf("{") + 1).split("}")[0];
	if (!line.includes("{")) return [];

	return body
		.split(",")
		.map((member) => readEnumMember(member.trim()))
		.filter((member): member is EnumMember => member !== null);
}

const PYTHON_ENUM_CLASS = /^\s*class\s+(\w+)\s*\([^)]*\bEnum\b[^)]*\)\s*:/;
const INTERFACE_PATTERN = /\binterface\s+(\w+)/;
const PYTHON_CLASS = /^\s*class\s+(\w+)\s*(?:\(([^)]*)\)\s*)?:/;

function declaredEnumName(line: string): string | null {
	return ENUM_PATTERN.exec(line)?.[1] ?? PYTHON_ENUM_CLASS.exec(line)?.[1] ?? null;
}

function declaredClassName(line: string): string | null {
	return (
		readClassName(line) ?? INTERFACE_PATTERN.exec(line)?.[1] ?? PYTHON_CLASS.exec(line)?.[1] ?? null
	);
}

/** The declaration being read, and the class a nested enum was declared inside. */
interface ModelScan {
	current: ModelEntry | null;
	enclosing: ModelEntry | null;
	jsonName: string | null;
}

function newEntry(line: string, enumName: string | null): ModelEntry {
	if (enumName) return { properties: [], baseTypes: [], enumMembers: readInlineMembers(line) };

	return {
		properties: readPositionalProperties(line).map((property) => ({ ...property, jsonName: null })),
		baseTypes: readBaseTypes(line),
		enumMembers: null,
	};
}

function openEntry(
	scan: ModelScan,
	line: string,
	enumName: string | null,
	className: string | null,
	index: ModelIndex,
): void {
	if (!enumName) scan.enclosing = null;
	else if (!scan.current?.enumMembers) scan.enclosing = scan.current;

	scan.current = newEntry(line, enumName);
	index.set(enumName ?? className!, scan.current);
	scan.jsonName = null;
}

function addMember(scan: ModelScan, current: ModelEntry, line: string): void {
	const property = readProperty(line);

	if (current.enumMembers && !property) {
		const member = readEnumMember(line);
		if (member) current.enumMembers.push(member);
		return;
	}

	/** A property after a nested enum belongs to the class that declared it. */
	const holder = current.enumMembers && scan.enclosing ? scan.enclosing : current;

	scan.current = holder;

	if (property && !holder.enumMembers) {
		holder.properties.push({ ...property, jsonName: scan.jsonName });
		scan.jsonName = null;
	}
}

export function indexModelProperties(sources: string[][], framework: FrameworkRules): ModelIndex {
	const index: ModelIndex = new Map();
	const nameAnnotations = framework.serialization?.nameAnnotations ?? [];

	for (const lines of sources) {
		const scan: ModelScan = { current: null, enclosing: null, jsonName: null };

		for (const line of lines) {
			const enumName = declaredEnumName(line);
			const className = declaredClassName(line);

			if (enumName || className) {
				openEntry(scan, line, enumName, className, index);
				continue;
			}

			if (!scan.current) continue;

			scan.jsonName = readJsonName(line, nameAnnotations) ?? scan.jsonName;
			addMember(scan, scan.current, line);
		}
	}

	return index;
}

export function collectProperties(
	index: ModelIndex,
	typeName: string,
	seen: Set<string>,
): ModelProperty[] {
	const entry = index.get(typeName);
	if (!entry || seen.has(typeName)) return [];

	seen.add(typeName);

	const inherited = entry.baseTypes.flatMap((baseType) => collectProperties(index, baseType, seen));
	const byName = new Map<string, ModelProperty>();

	for (const property of [...inherited, ...entry.properties]) byName.set(property.name, property);

	return Array.from(byName.values());
}

/** A query object binds one request parameter per property, not one per object. */
export function expandQueryParameters(
	index: ModelIndex,
	framework: FrameworkRules,
	parameters: ApiParameter[],
): ApiParameter[] {
	return parameters.flatMap((parameter) => {
		if (parameter.location !== "query" || !parameter.schemaType) return [parameter];

		const properties = collectProperties(index, parameter.schemaType, new Set<string>());
		if (properties.length === 0) return [parameter];

		return properties.map((property) => ({
			name: property.name,
			location: "query" as const,
			required: parameter.required && !property.type.endsWith("?"),
			description: null,
			schemaType: schemaTypeOf(property.type, framework.types),
			example: null,
		}));
	});
}
