import { describe, expect, it, vi } from "vitest";

import { resolveBasePort } from "@/shared/lib/environment/dev-port";
import { listDotnetScripts, resolveDotnetLaunch, resolveDotnetPorts } from "@/shared/lib/environment/dotnet-runner";
import { buildProcessTree, getDescendantPids, readCommandLines, scanListeningPorts } from "@/shared/lib/environment/ports";

import { memoryReader } from "../stack-detection/memory-reader";
import {
	DOTNET_SCRIPT_NAMES,
	DOTNET_TREES,
	LSOF_OUTPUT,
	PS_COMMAND_OUTPUT,
	PS_TREE_OUTPUT,
	SCRIPT_COMMANDS,
} from "./environment.cases";

vi.mock("@/platform/exec", () => ({
	currentOs: async () => "macos",
	execFile: async (command: string, args: string[]) => {
		if (command === "lsof") return { stdout: LSOF_OUTPUT, stderr: "" };
		if (command === "ps" && args[1] === "pid,ppid") return { stdout: PS_TREE_OUTPUT, stderr: "" };
		if (command === "ps") return { stdout: PS_COMMAND_OUTPUT, stderr: "" };
		throw new Error(`unexpected ${command}`);
	},
}));

describe("dev-port golden", () => {
	it("resolveBasePort", () => {
		expect(SCRIPT_COMMANDS.map((command) => [command, resolveBasePort(command)])).toMatchSnapshot();
	});
});

describe("dotnet-runner golden", () => {
	for (const { name, tree } of DOTNET_TREES) {
		it(name, async () => {
			const project = memoryReader(tree);
			const launches: Array<[string, unknown]> = [];
			for (const scriptName of DOTNET_SCRIPT_NAMES) {
				launches.push([scriptName, await resolveDotnetLaunch(project, scriptName)]);
			}

			expect({
				scripts: await listDotnetScripts(project),
				launches,
				ports: await resolveDotnetPorts(project),
			}).toMatchSnapshot();
		});
	}
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
