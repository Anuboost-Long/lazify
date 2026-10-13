/**
 * Shared by the go-to-definition golden test and its Electron recorder
 * (docs/rewrite/scripts/definition-recorder), so both answer the same
 * questions about the same project. No app imports: the recorder has no `@/`
 * alias.
 */
import fs from "node:fs/promises";
import path from "node:path";

export type FindDefinition = (
	projectPath: string,
	symbol: string,
	fromPath?: string | null,
	position?: { line: number; column: number } | null,
) => Promise<unknown>;

export interface HighlightingApi {
	list: () => Promise<unknown>;
}

const HOME = [
	'import { Button } from "../components";',
	'import { format } from "date-fns";',
	'import { helper } from "@/lib/helper";',
	"",
	"export function Home() {",
	'  return <Button label="Hi" onPress={() => format(new Date(), helper())} />;',
	"}",
	"",
].join("\n");

const PROJECT: Record<string, string> = {
	"src/components/Button.tsx": [
		"export interface ButtonProps {",
		"  label: string;",
		"  onPress?: () => void;",
		"}",
		"",
		"export function Button(props: Readonly<ButtonProps>) {",
		"  return null;",
		"}",
		"",
	].join("\n"),
	"src/components/index.ts": 'export { Button } from "./Button";\nexport * from "./Card";\n',
	"src/components/Card.tsx": "const Card = () => null;\n\nexport default Card;\n",
	"src/screens/Home.tsx": HOME,
	"src/lib/helper.ts": "export const helper = () => 1;\n",
	"src/lib/Anonymous.tsx": "export default () => null;\n",
	"src/services/UserService.cs": "namespace App;\n\npublic sealed class UserService\n{\n}\n",
	"src/Widget.ts": "function Widget() {}\n",
	"src/deep/a/b/c/Widget.ts": "export function Widget() {}\n",
	"src/big.ts": `${"// padding\n".repeat(50_000)}export const Huge = 1;\n`,
	"node_modules/ui/Hidden.tsx": "export function Hidden() {}\n",
	"dist/Bundled.js": "export function Bundled() {}\n",
	"README.md": "export function Readme() {}\n",
};

const HIGHLIGHTING: Record<string, string> = {
	"themes/nord.json": JSON.stringify({ name: "Nord", type: "dark", colors: {} }),
	"themes/paper.json": JSON.stringify({ displayName: "Paper", colors: { "editor.background": "#fafafa" } }),
	"themes/plain.json": JSON.stringify({ colors: {} }),
	"themes/broken.json": "{ nope",
	"themes/notes.txt": "not a theme",
	"languages/rust.tmLanguage.json": JSON.stringify({ name: "Rust", fileTypes: ["rs", 3] }),
	"extensions.json": JSON.stringify({ ".rsx": "rust", ".bad": 1 }),
};

async function writeTree(root: string, files: Record<string, string>) {
	for (const [relative, contents] of Object.entries(files)) {
		await fs.mkdir(path.dirname(path.join(root, relative)), { recursive: true });
		await fs.writeFile(path.join(root, relative), contents);
	}
}

export async function writeProject(project: string) {
	await fs.rm(project, { recursive: true, force: true });
	await writeTree(project, PROJECT);
	await fs.symlink("lib/helper.ts", path.join(project, "src/Linked.ts"));
}

const column = (word: string) => HOME.split("\n")[5].indexOf(word);

export interface DefinitionCase {
	name: string;
	symbol: string;
	from?: string;
	position?: { line: number; column: number };
}

export const DEFINITION_CASES: DefinitionCase[] = [
	{ name: "a name, searched across the project", symbol: "Button" },
	{ name: "a name followed through its import and a barrel", symbol: "Button", from: "src/screens/Home.tsx" },
	{ name: "a JSX prop, through the component's props type", symbol: "label", from: "src/screens/Home.tsx", position: { line: 6, column: column("label") } },
	{ name: "an optional JSX prop", symbol: "onPress", from: "src/screens/Home.tsx", position: { line: 6, column: column("onPress") } },
	{ name: "a name imported from a package", symbol: "format", from: "src/screens/Home.tsx" },
	{ name: "a name imported through an alias", symbol: "helper", from: "src/screens/Home.tsx" },
	{ name: "a declaration that isn't exported", symbol: "Card" },
	{ name: "a file named after a default export", symbol: "Anonymous" },
	{ name: "a C# class", symbol: "UserService" },
	{ name: "an export deeper down beats a plain declaration above it", symbol: "Widget" },
	{ name: "a file too big to read", symbol: "Huge" },
	{ name: "only in node_modules and dist", symbol: "Hidden" },
	{ name: "only in a file that isn't source", symbol: "Readme" },
	{ name: "nothing declares it", symbol: "Missing" },
	{ name: "not an identifier", symbol: "two words" },
	{ name: "a relative import path", symbol: "./Button", from: "src/components/index.ts" },
	{ name: "a relative import of a folder", symbol: "../components", from: "src/screens/Home.tsx" },
	{ name: "an alias import path", symbol: "@/lib/helper" },
	{ name: "a path that leaves the project", symbol: "../../../outside", from: "src/screens/Home.tsx" },
	{ name: "a package name", symbol: "date-fns/format" },
];

/** Every case against one project, then the highlighting folder twice: empty, then filled. */
export async function runDefinitionCases(find: FindDefinition, project: string) {
	await writeProject(project);
	const results: Record<string, unknown> = {};

	for (const testCase of DEFINITION_CASES) {
		results[testCase.name] = await find(
			project,
			testCase.symbol,
			testCase.from ? path.join(project, testCase.from) : null,
			testCase.position ?? null,
		).catch((error: Error) => ({ threw: error.message }));
	}

	return results;
}

export async function runHighlightingCase(api: HighlightingApi, folder: string) {
	await fs.rm(folder, { recursive: true, force: true });
	const empty = await api.list();
	const readme = await fs.readFile(path.join(folder, "README.md"), "utf8");

	await writeTree(folder, HIGHLIGHTING);
	const filled = await api.list();

	return { empty, readme, filled };
}
