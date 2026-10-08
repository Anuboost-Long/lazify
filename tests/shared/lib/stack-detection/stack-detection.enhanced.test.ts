import { describe, expect, it } from "vitest";

import { detectProjectStack } from "@/shared/lib/stack-detection/detect-stack";

import { memoryReader } from "./memory-reader";
import { DIFFERENT_BY_DESIGN, STACK_DETECTION_CASES, type ProjectTree } from "./stack-detection.cases";

const treeOf = (name: string) => {
	const found = STACK_DETECTION_CASES.find((testCase) => testCase.name === name);
	if (!found) throw new Error(`No case named "${name}"`);

	return found.tree;
};

const detect = (tree: ProjectTree) => detectProjectStack(memoryReader(tree));

const packageJson = (value: unknown) => ({ "package.json": JSON.stringify(value) });

describe("detectProjectStack, different by design from Electron", () => {
	it.each([
		["vite react app with pnpm", "react-vite", "vite", 0.95],
		["next app with yarn and no dev script", "react-next", "nextjs", 0.95],
		["create react app", "react-cra", "cra", 0.95],
		["expo app with bun", "react-native-expo", "expo", 0.95],
		["react native cli app with native folders", "react-native-cli", "react-native-cli", 0.9],
		["electron with vite and react", "electron", "electron", 0.95],
		["bare react", "react-unknown", "unknown", 0.65],
		["bare react without scripts", "react-unknown", "unknown", 0.65],
		["next app vendoring a dotnet sample", "react-next", "nextjs", 0.95],
	])("%s is detected as %s", async (name, stack, metaFramework, confidence) => {
		expect(DIFFERENT_BY_DESIGN.has(name)).toBe(true);
		await expect(detect(treeOf(name))).resolves.toMatchObject({ stack, metaFramework, confidence });
	});

	it("covers every case listed as different by design", () => {
		expect(DIFFERENT_BY_DESIGN.size).toBe(9);
	});

	it("gives a vite app its own commands and no stack warnings", async () => {
		await expect(detect(treeOf("vite react app with pnpm"))).resolves.toMatchObject({
			commands: {
				install: "pnpm install",
				dev: "pnpm dev",
				build: "pnpm build",
				preview: "pnpm preview",
				lint: "pnpm lint",
			},
			warnings: [],
		});
	});

	it("runs ios through the react native cli, not expo", async () => {
		const result = await detect(treeOf("react native cli app with native folders"));

		expect(result.commands.ios).toBe("npx react-native run-ios");
		expect(result.warnings).toEqual(["No lock file found. Defaulted to npm."]);
	});

	it("still reports a genuine mix of stacks", async () => {
		const result = await detect(treeOf("electron with vite and react"));

		expect(result.warnings).toEqual([
			"Multiple stack indicators detected.",
			"Multiple indicators found: electron + react-vite. Classified as electron because it has higher priority.",
		]);
	});
});

describe("detectProjectStack, signals Electron did not read", () => {
	it("trusts package.json's packageManager over lock files", async () => {
		const result = await detect({
			...packageJson({ packageManager: "pnpm@9.12.0", scripts: { dev: "vite" }, devDependencies: { vite: "6.0.0" } }),
			"package-lock.json": "{}",
		});

		expect(result.packageManager).toBe("pnpm");
		expect(result.commands.install).toBe("pnpm install");
		expect(result.warnings).toEqual([]);
	});

	it("falls back to lock files when packageManager names something else", async () => {
		const result = await detect({
			...packageJson({ packageManager: "deno@2.0.0", devDependencies: { vite: "6.0.0" } }),
			"yarn.lock": "",
		});

		expect(result.packageManager).toBe("yarn");
	});

	it("recognises vite.config.mts and lists index.html", async () => {
		const result = await detect({
			...packageJson({ dependencies: { react: "19.0.0", "react-dom": "19.0.0" } }),
			"vite.config.mts": "",
			"index.html": "",
		});

		expect(result.stack).toBe("react-vite");
		expect(result.confidence).toBe(0.85);
		expect(result.reasons).toEqual([
			"vite.config.mts exists",
			"react dependency found",
			"react-dom dependency found",
			"index.html exists",
		]);
	});

	it("recognises an electron forge project", async () => {
		const result = await detect({
			...packageJson({ scripts: { start: "electron-forge start" }, devDependencies: { "@electron-forge/cli": "7.5.0" } }),
			"package-lock.json": "{}",
		});

		expect(result.stack).toBe("electron");
		expect(result.reasons).toEqual(["@electron-forge/cli dependency found"]);
	});

	it("does not call a library electron because its main entry says main", async () => {
		const result = await detect({
			...packageJson({ main: "dist/main.js", dependencies: { lodash: "4.17.21" } }),
			"package-lock.json": "{}",
		});

		expect(result.stack).toBe("unknown");
	});

	it("does not call a project expo for app.json and metro.config.js alone", async () => {
		const result = await detect({ "app.json": "{}", "metro.config.js": "" });

		expect(result.stack).toBe("unknown");
	});
});
