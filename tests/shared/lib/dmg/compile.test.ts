import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { appFolders, nodeFolders } from "../../../platform/node-folders";

interface Call {
	command: string;
	args: string[];
}

const calls: Call[] = [];

/** Which step, if any, answers a non-zero exit this run. */
let failStep: string | null = null;
let mountPoint = "/Volumes/Probe";

const { ExecFileError } = vi.hoisted(() => ({
	ExecFileError: class ExecFileError extends Error {
		constructor(
			message: string,
			readonly code: number | null,
			readonly killed: boolean,
			readonly stdout: string,
			readonly stderr: string,
		) {
			super(message);
		}
	},
}));

vi.mock("@chain/sdk", () => ({ desktop: { folders: nodeFolders } }));
vi.mock("@/platform/exec", () => ({
	currentOs: async () => "macos",
	ExecFileError,
	execFile: async (command: string, args: string[]) => {
		calls.push({ command, args });

		const fail = (step: string) => {
			if (failStep !== step) return false;
			throw new ExecFileError(`${step} failed`, 1, false, "", `${step} failed`);
		};

		if (command === "ditto") {
			if (fail("ditto")) return { stdout: "", stderr: "" };

			// A native rejection that crossed the bridge as something other than
			// ExecFileError — a plain object, not a proper Error.
			if (failStep === "ditto-native") throw { message: "Access was denied" };

			await fs.cp(args[0], args[1], { recursive: true }).catch(() => undefined);

			return { stdout: "", stderr: "" };
		}

		if (command === "ln") {
			if (fail("ln")) return { stdout: "", stderr: "" };

			await fs.symlink(args[1], args[2]).catch(() => undefined);

			return { stdout: "", stderr: "" };
		}

		if (command === "hdiutil" && args[0] === "create") {
			if (fail("hdiutil-create")) return { stdout: "", stderr: "" };

			await fs.writeFile(args.at(-1) as string, "scratch");

			return { stdout: "", stderr: "" };
		}

		if (command === "hdiutil" && args[0] === "attach") {
			if (fail("hdiutil-attach")) return { stdout: "", stderr: "" };

			return { stdout: `/dev/disk4\t Apple_HFS\t${mountPoint}\n`, stderr: "" };
		}

		if (command === "osascript") {
			if (fail("osascript")) return { stdout: "", stderr: "" };

			return { stdout: "", stderr: "" };
		}

		if (command === "hdiutil" && args[0] === "detach") return { stdout: "", stderr: "" };

		if (command === "hdiutil" && args[0] === "convert") {
			if (fail("hdiutil-convert")) return { stdout: "", stderr: "" };

			await fs.copyFile(args[1], args[5] as string).catch(() => undefined);

			return { stdout: "", stderr: "" };
		}

		if (command === "xattr") return { stdout: "", stderr: "" };

		return { stdout: "", stderr: "" };
	},
}));

const { compileDmg } = await import("@/shared/lib/dmg/compile");

const base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "lazify-dmg-compile-")));
appFolders.temp = path.join(base, "temp");

async function makeApp(name = "Probe.app"): Promise<string> {
	const appPath = path.join(base, name);

	await fs.mkdir(path.join(appPath, "Contents", "MacOS"), { recursive: true });
	await fs.writeFile(path.join(appPath, "Contents", "Info.plist"), "");

	return appPath;
}

afterAll(() => fs.rm(base, { recursive: true, force: true }));

beforeEach(() => {
	calls.length = 0;
	failStep = null;
	mountPoint = "/Volumes/Probe";
});

describe("compileDmg", () => {
	it("refuses before touching a single process, for a bad destination", async () => {
		const appPath = await makeApp();

		const result = await compileDmg({ appPath, outputPath: path.join(base, "out.zip") });

		expect(result).toEqual({
			success: false,
			outputPath: "",
			sizeBytes: 0,
			message: "The output file needs a .dmg extension.",
			warning: null,
		});
		expect(calls).toHaveLength(0);
	});

	it("refuses a destination inside the app being packaged", async () => {
		const appPath = await makeApp();

		const result = await compileDmg({
			appPath,
			outputPath: path.join(appPath, "out.dmg"),
		});

		expect(result.message).toBe("Choose a destination outside the app itself.");
		expect(calls).toHaveLength(0);
	});

	it("runs the steps in order and produces a file", async () => {
		const appPath = await makeApp();
		const outputPath = path.join(base, "out.dmg");
		const steps: string[] = [];

		const result = await compileDmg({ appPath, outputPath }, (progress) => steps.push(progress.step));

		expect(result.success).toBe(true);
		expect(result.outputPath).toBe(outputPath);
		expect(await fs.readFile(outputPath, "utf8")).toBe("scratch");
		expect(steps).toEqual(["staging", "styling", "compressing", "done"]);
		const label = (call: Call) => (call.command === "hdiutil" ? `hdiutil ${call.args[0]}` : call.command);

		// This bundle carries no icon of its own, so applyVolumeIcon finds
		// nothing to write and xattr never runs — a case of its own below.
		// plutil reads Info.plist, once to inspect the bundle and once more
		// looking for a volume icon.
		expect(calls.map(label)).toEqual([
			"plutil",
			"ditto",
			"ln",
			"hdiutil create",
			"hdiutil attach",
			"osascript",
			"plutil",
			"hdiutil detach",
			"hdiutil convert",
		]);
		expect(calls.find((call) => call.command === "ditto")?.args[0]).toBe(appPath);
	});

	it("unmounts and cleans up the scratch folder when styling fails", async () => {
		failStep = "osascript";

		const appPath = await makeApp();
		const outputPath = path.join(base, "fail-styling.dmg");

		const result = await compileDmg({ appPath, outputPath });

		// A styling failure is a warning, not a failure — the build still finishes.
		expect(result.success).toBe(true);
		expect(result.warning).toContain("window layout could not be applied");
		expect(calls.some((call) => call.command === "hdiutil" && call.args[0] === "detach")).toBe(true);
	});

	it("unmounts when a later step fails outright", async () => {
		failStep = "hdiutil-convert";

		const appPath = await makeApp();
		const outputPath = path.join(base, "fail-convert.dmg");

		const result = await compileDmg({ appPath, outputPath });

		expect(result.success).toBe(false);
		expect(result.message).toBe("hdiutil-convert failed");

		const detaches = calls.filter((call) => call.command === "hdiutil" && call.args[0] === "detach");

		expect(detaches.length).toBeGreaterThanOrEqual(1);
	});

	it("still reports a readable message when a failure isn't a proper Error", async () => {
		failStep = "ditto-native";

		const appPath = await makeApp();
		const result = await compileDmg({ appPath, outputPath: path.join(base, "fail-native.dmg") });

		expect(result.success).toBe(false);
		expect(result.message).toBe("Access was denied");
		expect(result.message).not.toContain("[object Object]");
	});

	it("leaves no scratch work behind, success or failure", async () => {
		const temp = appFolders.temp;

		await compileDmg({ appPath: await makeApp("Clean1.app"), outputPath: path.join(base, "clean1.dmg") });

		failStep = "hdiutil-create";
		await compileDmg({ appPath: await makeApp("Clean2.app"), outputPath: path.join(base, "clean2.dmg") });

		await expect(fs.readdir(temp).then((entries) => entries.length)).resolves.toBe(0);
	});
});
