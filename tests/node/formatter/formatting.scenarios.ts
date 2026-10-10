import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { FormatOutcome, FormatterDefaults, FormatterSettings, ProjectFormatter } from "../../../src/shared/lib/formatting/types";

/**
 * One scenario, run against Electron's formatter (the recorder) and against
 * the Node formatter the Chain app runs (the golden test), on the same real
 * folders. Both use Prettier 3.9.6.
 */
export interface FormattingApi {
	format(projectPath: string, paths: string[], mode: "write" | "preview", settings: FormatterSettings): Promise<FormatOutcome>;
	projectFormatter(projectPath: string): Promise<ProjectFormatter>;
	sample(defaults: FormatterDefaults): Promise<string>;
}

const DEFAULTS: FormatterDefaults = {
	printWidth: 100,
	tabWidth: 2,
	useTabs: false,
	semi: true,
	singleQuote: false,
	trailingComma: "none",
	bracketSpacing: true,
	endOfLine: "lf",
};

const SETTINGS: FormatterSettings = { mode: "manual", organizeImports: true, defaults: DEFAULTS };

const MESSY_TS = `import { Panel } from "./Panel";
import path from "node:path";
import { translation } from "@/i18n/translation";
import clsx from "clsx";
export const x = {a:1,b:[1,2,3],  c: 'str'}
export function f(a,b){return clsx(path.join(a,b), Panel, translation)}
`;

const LAZY_PLUGIN = `export const languages = [{ name: "lazy", parsers: ["lazy"], extensions: [".lazy"] }];
export const parsers = {
	lazy: { parse: (text) => ({ type: "root", text }), astFormat: "lazy", locStart: () => 0, locEnd: (node) => node.text.length }
};
export const printers = { lazy: { print: (p) => p.node.text.toUpperCase() } };
`;

function write(root: string, files: Record<string, string>) {
	for (const [name, text] of Object.entries(files)) {
		fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
		fs.writeFileSync(path.join(root, name), text);
	}
}

function read(root: string, names: string[]) {
	return Object.fromEntries(names.map((name) => [name, fs.existsSync(path.join(root, name)) ? fs.readFileSync(path.join(root, name), "utf8") : null]));
}

function project(root: string, name: string, files: Record<string, string>) {
	const folder = path.join(root, name);
	write(folder, files);
	return folder;
}

export async function exercise(api: FormattingApi): Promise<Record<string, unknown>> {
	const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "lazify-formatting-")));
	const results: Record<string, unknown> = {};
	const normalize = (value: unknown) => JSON.parse(JSON.stringify(value).split(root).join("<root>"));

	try {
		const plain = project(root, "plain", {
			"src/app.ts": MESSY_TS,
			"src/clean.ts": 'export const clean = "already";\n',
			"src/broken.ts": "export const = ;\n",
			"src/style.css": "a{color:red;margin:0 auto}\n",
			"data.json": '{"a":1,"b":[1,2]}',
			"README.md": "# Title\n*  item\n*  item\n",
			"notes.xyz": "not a language\n",
			"ignored/skip.ts": "const   skip=1\n",
			".prettierignore": "ignored/\n",
			"big.js": `const big = ${JSON.stringify("x".repeat(2_000_100))};\n`,
			"tsconfig.json": '{\n  // comment\n  "compilerOptions": { "paths": { "@/*": ["./src/*"] } }\n}\n',
		});
		const plainFiles = ["src/app.ts", "src/clean.ts", "src/broken.ts", "src/style.css", "data.json", "README.md", "notes.xyz", "ignored/skip.ts"];
		const plainPaths = [...plainFiles, "gone.ts", "../outside.ts", "big.js", "src"];

		results["no config: project formatter"] = normalize(await api.projectFormatter(plain));
		results["no config: preview"] = normalize(await api.format(plain, plainPaths, "preview", SETTINGS));
		results["no config: preview leaves files alone"] = read(plain, plainFiles);
		results["no config: write"] = normalize(await api.format(plain, plainPaths, "write", SETTINGS));
		results["no config: files after write"] = read(plain, plainFiles);
		results["no config: second write changes nothing"] = normalize(await api.format(plain, plainFiles, "write", SETTINGS));

		const unsorted = project(root, "unsorted", { "src/app.ts": MESSY_TS, "tsconfig.json": '{"compilerOptions":{"paths":{"@/*":["./src/*"]}}}' });
		results["organize imports off"] = normalize(
			await api.format(unsorted, ["src/app.ts"], "write", { ...SETTINGS, organizeImports: false }),
		);
		results["organize imports off: file"] = read(unsorted, ["src/app.ts"]);

		const custom = project(root, "custom-defaults", { "src/app.ts": MESSY_TS });
		results["app defaults changed"] = normalize(
			await api.format(custom, ["src/app.ts"], "write", {
				...SETTINGS,
				defaults: { ...DEFAULTS, printWidth: 40, semi: false, singleQuote: true, useTabs: true, trailingComma: "all" },
			}),
		);
		results["app defaults changed: file"] = read(custom, ["src/app.ts"]);

		const rc = project(root, "prettierrc", {
			".prettierrc": JSON.stringify({ semi: false, singleQuote: true, overrides: [{ files: "*.css", options: { tabWidth: 8 } }] }),
			"src/app.ts": MESSY_TS,
			"src/style.css": "a{color:red;margin:0 auto}\n",
		});
		results[".prettierrc: project formatter"] = normalize(await api.projectFormatter(rc));
		results[".prettierrc: write"] = normalize(await api.format(rc, ["src/app.ts", "src/style.css"], "write", SETTINGS));
		results[".prettierrc: files"] = read(rc, ["src/app.ts", "src/style.css"]);

		const pkg = project(root, "package-key", {
			"package.json": JSON.stringify({ name: "package-key", prettier: { tabWidth: 4, semi: false } }),
			"src/app.ts": MESSY_TS,
		});
		results["package.json key: project formatter"] = normalize(await api.projectFormatter(pkg));
		results["package.json key: write"] = normalize(await api.format(pkg, ["src/app.ts"], "write", SETTINGS));
		results["package.json key: files"] = read(pkg, ["src/app.ts"]);

		const js = project(root, "js-config", {
			"prettier.config.mjs": 'export default { semi: false, printWidth: 30, plugins: ["prettier-plugin-lazy"] };\n',
			"node_modules/prettier-plugin-lazy/package.json": JSON.stringify({ name: "prettier-plugin-lazy", type: "module", main: "index.js" }),
			"node_modules/prettier-plugin-lazy/index.js": LAZY_PLUGIN,
			"src/app.ts": MESSY_TS,
			"shout.lazy": "quiet words\n",
		});
		results["JS config with a plugin: project formatter"] = normalize(await api.projectFormatter(js));
		results["JS config with a plugin: write"] = normalize(await api.format(js, ["src/app.ts", "shout.lazy"], "write", SETTINGS));
		results["JS config with a plugin: files"] = read(js, ["src/app.ts", "shout.lazy"]);

		const broken = project(root, "broken-config", { ".prettierrc": "{ not json", "src/app.ts": MESSY_TS });
		results["broken config: project formatter"] = normalize(await api.projectFormatter(broken));
		results["broken config: write"] = normalize(await api.format(broken, ["src/app.ts"], "write", SETTINGS));
		results["broken config: files"] = read(broken, ["src/app.ts"]);

		write(path.join(root, "parent"), { ".prettierrc.json": JSON.stringify({ useTabs: true }) });
		const nested = project(root, "parent/nested", { "src/app.ts": MESSY_TS });
		results["config in a parent folder: project formatter"] = normalize(await api.projectFormatter(nested));
		results["config in a parent folder: write"] = normalize(await api.format(nested, ["src/app.ts"], "write", SETTINGS));
		results["config in a parent folder: files"] = read(nested, ["src/app.ts"]);

		results["missing project: project formatter"] = normalize(await api.projectFormatter(path.join(root, "missing")));
		results["missing project: format"] = normalize(await api.format(path.join(root, "missing"), ["a.ts"], "write", SETTINGS));

		results["sample: defaults"] = await api.sample(DEFAULTS);
		results["sample: changed"] = await api.sample({ ...DEFAULTS, printWidth: 40, tabWidth: 4, semi: false, singleQuote: true, trailingComma: "all", bracketSpacing: false });
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}

	return results;
}
