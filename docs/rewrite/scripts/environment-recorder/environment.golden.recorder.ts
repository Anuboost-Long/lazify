import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterAll, describe, expect, it, vi } from "vitest";

import {
	DOTNET_SCRIPT_NAMES,
	DOTNET_TREES,
	LSOF_OUTPUT,
	PS_COMMAND_OUTPUT,
	PS_TREE_OUTPUT,
	SCRIPT_COMMANDS,
} from "../../../../tests/shared/lib/environment/environment.cases";

vi.mock("node:child_process", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:child_process")>();
	const reply = (command: string, args: string[]) => {
		if (command === "lsof") return LSOF_OUTPUT;
		if (command === "ps" && args[1] === "pid,ppid") return PS_TREE_OUTPUT;
		if (command === "ps") return PS_COMMAND_OUTPUT;
		throw new Error(`unexpected ${command}`);
	};
	const execFile = Object.assign(() => {
		throw new Error("callback form not used");
	}, {
		[promisify.custom]: async (command: string, args: string[]) => ({ stdout: reply(command, args), stderr: "" }),
	});

	return { ...actual, default: { ...actual, execFile }, execFile };
});

const { resolveBasePort } = await import("../../../../../lazify/src/main/environment/dev-port");
const { listDotnetScripts, resolveDotnetLaunch, resolveDotnetPorts } = await import(
	"../../../../../lazify/src/main/environment/dotnet-runner"
);
const { buildProcessTree, getDescendantPids, readCommandLines, scanListeningPorts } = await import(
	"../../../../../lazify/src/main/environment/ports"
);

const base = await fs.mkdtemp(path.join(os.tmpdir(), "lazify-environment-"));

afterAll(() => fs.rm(base, { recursive: true, force: true }));

describe("dev-port golden", () => {
	it("resolveBasePort", () => {
		expect(SCRIPT_COMMANDS.map((command) => [command, resolveBasePort(command)])).toMatchSnapshot();
	});
});

describe("dotnet-runner golden", () => {
	DOTNET_TREES.forEach(({ name, tree }, index) => {
		it(name, async () => {
			const projectPath = path.join(base, String(index));
			await fs.mkdir(projectPath, { recursive: true });
			for (const [relative, contents] of Object.entries(tree)) {
				await fs.mkdir(path.dirname(path.join(projectPath, relative)), { recursive: true });
				await fs.writeFile(path.join(projectPath, relative), contents);
			}

			const launches: Array<[string, unknown]> = [];
			for (const scriptName of DOTNET_SCRIPT_NAMES) {
				launches.push([scriptName, await resolveDotnetLaunch(projectPath, scriptName)]);
			}

			expect({
				scripts: await listDotnetScripts(projectPath),
				launches,
				ports: await resolveDotnetPorts(projectPath),
			}).toMatchSnapshot();
		});
	});
});

describe("ports golden", () => {
	it("scanListeningPorts on macOS", async () => {
		expect(await scanListeningPorts()).toMatchSnapshot();
	});

	it("buildProcessTree and getDescendantPids on macOS", async () => {
		const tree = await buildProcessTree();

		expect({
			tree: [...tree.entries()],
			fromNext: [...getDescendantPids(70000, tree)].sort((a, b) => a - b),
			fromVite: [...getDescendantPids(69000, tree)].sort((a, b) => a - b),
			unknown: [...getDescendantPids(123, tree)],
		}).toMatchSnapshot();
	});

	it("readCommandLines on macOS", async () => {
		expect([...(await readCommandLines()).entries()]).toMatchSnapshot();
	});
});
