/**
 * Shared by the linting golden test and its Electron recorder
 * (docs/rewrite/scripts/linting-recorder), so both run the same inputs
 * through each side's code. No app imports: the recorder has no `@/` alias.
 *
 * The language servers are faked the same on both sides: an engine reports
 * one finding on every line holding `BAD`, so the scan, `lintPaths` and the
 * warm-up are checked around the servers rather than against them.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

interface Diagnostic {
	source: "sonarlint" | "tailwindcss";
	rule: string;
	code: string | null;
	message: string;
	url: string | null;
	line: number;
	column: number;
	endLine: number;
	endColumn: number;
}

interface FindingReference {
	diagnostic: Diagnostic;
	filePath: string;
	snippet: string;
	snippetStartLine: number;
}

interface ScanFileFindings {
	path: string;
	findings: FindingReference[];
}

type Awaitable<T> = T | Promise<T>;

export interface LintingApi {
	buildLintReport: (results: { path: string; diagnostics: Diagnostic[] }[], projectPath: string) => string;
	describeFixTask: (input: {
		projectPath: string;
		findings: FindingReference[];
		label?: string | null;
		presetId?: string | null;
	}) => unknown;
	planFixPhases: (files: ScanFileFindings[], count: number) => unknown;
	commonFolder: (files: ScanFileFindings[]) => string;
	phaseOptions: (fileCount: number) => number[];
	buildScanReportText: (report: never) => string;
	snippetAround: (content: string, diagnostic: Diagnostic) => unknown;
	collectScanFiles: (projectPath: string, cursor?: string | null) => Awaitable<{ files: string[] }>;
	lintPaths: (paths: string[]) => Promise<unknown>;
	startSonarScan: (projectPath: string, emit: (state: unknown) => void) => Promise<unknown>;
	stopSonarScan: (projectPath: string) => Awaitable<unknown>;
	warmLintEngines: (projectPath: string) => Promise<void>;
}

/** What the fake engines saw, in order, for the warm-up case. */
export const engineCalls: string[] = [];

export const ACTIVE_ENGINES = { sonarlint: true, tailwindcss: false };

/** The fake language servers: one finding per line holding `BAD`. */
export function fakeLint(filePath: string, content: string) {
	engineCalls.push(filePath);

	const diagnostics: Diagnostic[] = content.split("\n").flatMap((text, index) =>
		text.includes("BAD")
			? [
					{
						source: "sonarlint" as const,
						rule: "sonarlint/typescript:S1854",
						code: "typescript:S1854",
						message: `Remove this useless assignment on line ${index + 1}.`,
						url: "https://rules.sonarsource.com/typescript/RSPEC-1854/",
						line: index + 1,
						column: text.indexOf("BAD") + 1,
						endLine: index + 1,
						endColumn: text.indexOf("BAD") + 4,
					},
				]
			: [],
	);

	return { path: filePath, diagnostics };
}

const diagnostic = (over: Partial<Diagnostic> = {}): Diagnostic => ({
	source: "sonarlint",
	rule: "sonarlint/typescript:S1764",
	code: "typescript:S1764",
	message: 'Correct one of the identical sub-expressions on both sides of operator "&&".',
	url: "https://rules.sonarsource.com/typescript/RSPEC-1764/",
	line: 7,
	column: 7,
	endLine: 7,
	endColumn: 21,
	...over,
});

const PROJECT = "/work/shop";

const reference = (filePath: string, over: Partial<Diagnostic> = {}, snippet = "if (a && a) return;"): FindingReference => ({
	diagnostic: diagnostic(over),
	filePath: path.join(PROJECT, filePath),
	snippet,
	snippetStartLine: 3,
});

const tailwind = diagnostic({
	source: "tailwindcss",
	rule: "tailwindcss/suggestCanonicalClasses",
	code: "suggestCanonicalClasses",
	message: "The class `bg-black/[.94]` can be written as `bg-black/94`.",
	url: "https://tailwindcss.com/docs/editor-setup",
	line: 3,
	column: 15,
	endLine: 3,
	endColumn: 29,
});

const FILES: ScanFileFindings[] = [
	{ path: "src/cart/Cart.tsx", findings: [reference("src/cart/Cart.tsx"), reference("src/cart/Cart.tsx", { line: 12, endLine: 14 })] },
	{ path: "src/cart/total.ts", findings: [reference("src/cart/total.ts")] },
	{ path: "src/checkout/Pay.tsx", findings: Array.from({ length: 6 }, (_, index) => reference("src/checkout/Pay.tsx", { line: index + 1, endLine: index + 1 })) },
	{ path: "lib/money.ts", findings: [reference("lib/money.ts", { code: null, rule: "sonarlint", url: null })] },
	{ path: "README.md", findings: [reference("README.md", tailwind)] },
];

/** Pure functions: the texts agents and people read, and how a scan is split. */
export function runPureCases(api: LintingApi) {
	return {
		report: {
			clean: api.buildLintReport([{ path: `${PROJECT}/src/a.ts`, diagnostics: [] }], PROJECT),
			oneFinding: api.buildLintReport([{ path: `${PROJECT}/src/a.ts`, diagnostics: [diagnostic()] }], PROJECT),
			mixedEngines: api.buildLintReport(
				[
					{ path: `${PROJECT}/src/a.ts`, diagnostics: [diagnostic(), diagnostic({ code: null, rule: "sonarlint", url: null, line: 9 })] },
					{ path: `${PROJECT}/src/b.css`, diagnostics: [tailwind] },
					{ path: `${PROJECT}/src/clean.ts`, diagnostics: [] },
				],
				PROJECT,
			),
			outsideProject: api.buildLintReport([{ path: "/elsewhere/lib.js", diagnostics: [tailwind] }], PROJECT),
		},
		fixTask: {
			none: api.describeFixTask({ projectPath: PROJECT, findings: [] }),
			one: api.describeFixTask({ projectPath: PROJECT, findings: [reference("src/cart.mjs")] }),
			labelled: api.describeFixTask({
				projectPath: PROJECT,
				findings: FILES.flatMap((file) => file.findings),
				label: "Phase 2 of 3",
				presetId: "builtin-bug-fix",
			}),
			tooLong: (() => {
				const task = api.describeFixTask({
					projectPath: PROJECT,
					findings: Array.from({ length: 300 }, (_, index) =>
						reference("src/big.cts", { line: index + 1, endLine: index + 1 }, "x".repeat(80)),
					),
				}) as { notes: string; requirements: string[] };
				return { requirements: task.requirements.length, notesLength: task.notes.length, tail: task.notes.slice(-120) };
			})(),
		},
		phases: [1, 2, 3, 5, 9].map((count) => ({
			count,
			plan: (api.planFixPhases(FILES, count) as { index: number; files: ScanFileFindings[]; findingCount: number }[]).map(
				(phase) => ({ index: phase.index, files: phase.files.map((file) => file.path), findingCount: phase.findingCount, folder: api.commonFolder(phase.files) }),
			),
		})),
		phaseOptions: [0, 1, 4, 20].map((count) => api.phaseOptions(count)),
		snippets: [
			api.snippetAround("1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12", diagnostic({ line: 2, endLine: 2 })),
			api.snippetAround("1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12", diagnostic({ line: 7, endLine: 11 })),
		],
		scanText: api.buildScanReportText({
			projectPath: PROJECT,
			roots: ["lib", "src"],
			engines: ["sonarlint", "tailwindcss"],
			scannedAt: "2026-10-14T00:00:00.000Z",
			durationMs: 1234,
			fileCount: 40,
			findingCount: 11,
			skippedCount: 3,
			batch: { start: 1001, end: 1043, total: 1043 },
			resumeFrom: null,
			files: FILES,
		} as never),
	};
}

async function write(root: string, relativePath: string, contents = "export const value = 1;\n") {
	const filePath = path.join(root, relativePath);
	await fs.mkdir(path.dirname(filePath), { recursive: true });
	await fs.writeFile(filePath, contents);
}

const git = (cwd: string, ...args: string[]) =>
	execFileSync("git", args, { cwd, stdio: "ignore" }); // NOSONAR: git lives at a different absolute path on every platform, so PATH is the only portable way to find it

/** A repository and a plain folder, each with code, tests, output and ignored files. */
export async function makeProjects(base: string) {
	const repo = path.join(base, "repo");
	const plain = path.join(base, "plain");

	for (const root of [repo, plain]) {
		await write(root, "src/cart/Cart.tsx", "const total = 1;\nBAD = 2;\n");
		await write(root, "src/cart/total.ts");
		await write(root, "src/cart/Cart.test.tsx", "BAD\n");
		await write(root, "src/styles.css", ".a { color: red; }\nBAD\n");
		await write(root, "lib/money.mjs", "BAD\nBAD\n");
		await write(root, "docs/notes.md", "# Notes\n");
		await write(root, "assets/logo.png", "binary");
		await write(root, "dist/bundle.js", "BAD\n");
		await write(root, "node_modules/pkg/index.js", "BAD\n");
		await write(root, "tests/cart.ts", "BAD\n");
		await write(root, ".cache/x.ts", "BAD\n");
		await write(root, "package.json", '{"name":"shop"}\n');
	}

	git(repo, "init", "--quiet");
	await write(repo, ".gitignore", "dist/\n.cache/\nsecret.ts\n");
	await write(repo, "secret.ts", "BAD\n");
	await write(repo, "src/gone.ts", "BAD\n");
	git(repo, "add", "--all");
	await fs.rm(path.join(repo, "src/gone.ts"));

	return { repo, plain };
}

const relativeFiles = (root: string, files: string[]) => files.map((file) => path.relative(root, file));

/** Everything around the language servers: which files, which findings, which report. */
export async function runProjectCases(api: LintingApi, base: string) {
	const { repo, plain } = await makeProjects(base);
	const scrub = (value: unknown) =>
		JSON.parse(
			JSON.stringify(value)
				.replaceAll(base, "<base>")
				.replaceAll(/"scannedAt":"[^"]+"/g, '"scannedAt":"<time>"')
				.replaceAll(/"durationMs":\d+/g, '"durationMs":0'),
		);

	const repoFiles = await api.collectScanFiles(repo);
	const plainFiles = await api.collectScanFiles(plain);

	const lintPaths = await api.lintPaths([
		path.join(repo, "src/cart/Cart.tsx"),
		path.join(repo, "src/cart/Cart.tsx"),
		path.join(repo, "src/missing.ts"),
		path.join(repo, "docs/notes.md"),
		path.join(repo, "lib/money.mjs"),
		...Array.from({ length: 30 }, (_, index) => path.join(repo, `src/many-${index}.ts`)),
	]);

	const steps: unknown[] = [];
	const firstRun = await api.startSonarScan(repo, (state) => steps.push((state as { status: string }).status));
	const secondRun = await api.startSonarScan(repo, () => undefined);
	const stored = JSON.parse(await fs.readFile(path.join(repo, ".lazify", "sonar-scan.json"), "utf8"));
	const ignore = await fs.readFile(path.join(repo, ".gitignore"), "utf8");

	ACTIVE_ENGINES.sonarlint = false;
	const noEngines = await api.startSonarScan(plain, () => undefined);
	ACTIVE_ENGINES.sonarlint = true;
	const stopped = await api.stopSonarScan(plain);

	engineCalls.length = 0;
	await api.warmLintEngines(repo);
	await api.warmLintEngines(repo);
	const warmed = [...engineCalls];

	return scrub({
		repoFiles: { ...repoFiles, files: relativeFiles(repo, repoFiles.files) },
		plainFiles: { ...plainFiles, files: relativeFiles(plain, plainFiles.files) },
		lintPaths,
		steps: [...new Set(steps)],
		firstRun,
		secondRun,
		stored,
		ignore,
		noEngines,
		stopped,
		warmed,
	});
}
