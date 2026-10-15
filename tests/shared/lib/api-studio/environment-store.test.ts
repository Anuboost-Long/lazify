import { execFile as nodeExecFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { appFolders, nodeFolders } from "../../../platform/node-folders";

const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-api-env-store-"));
appFolders.data = userDataPath;

vi.mock("@chain/sdk", () => ({ desktop: { folders: nodeFolders } }));

/** chmod's real effect is the thing under test, so this runs it for real rather than faking it. */
vi.mock("@/platform/exec", () => ({
	restrictToOwner: async (filePath: string) => {
		if (process.platform === "win32") return;

		await promisify(nodeExecFile)("chmod", ["600", filePath]);
	},
}));

const { readEnvironments, saveEnvironments } =
	await import("@/shared/lib/api-studio/environment-store");

const SECRETS = ["authorization"];

let projectPath: string;

function secretFile() {
	return path.join(userDataPath, "api-studio-environments.json");
}

function presetFile() {
	return path.join(projectPath, ".lazify", "api-studio", "environments.json");
}

beforeEach(() => {
	projectPath = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "lazify-api-env-project-")));
	fs.rmSync(secretFile(), { force: true });
});

afterEach(() => {
	fs.rmSync(projectPath, { recursive: true, force: true });
});

function expectOwnerOnlyWhereTheFilesystemCarriesModes(file: string) {
	if (process.platform === "win32") return;

	expect(fs.statSync(file).mode & 0o777).toBe(0o600);
}

describe("environment presets", () => {
	it("keeps the variables a user added beside the presets, in the project", async () => {
		await saveEnvironments(
			projectPath,
			{
				activeId: "local",
				names: {},
				variables: [{ key: "xApiKey", name: "xApiKey", secret: true }],
				environments: [{ id: "local", name: "Local", values: { xApiKey: "k-1" } }],
			},
			["xApiKey"],
		);

		const stored = JSON.parse(fs.readFileSync(presetFile(), "utf8"));

		expect(stored.variables).toEqual([{ key: "xApiKey", name: "xApiKey", secret: true }]);
		expect(stored.environments[0].values).toEqual({});
		expect((await readEnvironments(projectPath)).variables).toHaveLength(1);
		expect((await readEnvironments(projectPath)).environments[0].values.xApiKey).toBe("k-1");
	});

	it("starts a project with one environment to fill in", async () => {
		const set = await readEnvironments(projectPath);

		expect(set.environments).toEqual([{ id: "local", name: "Local", values: {} }]);
		expect(set.activeId).toBe("local");
	});

	it("shares names and plain values through the project, keeping secrets on this machine", async () => {
		await saveEnvironments(
			projectPath,
			{
				activeId: "staging",
				names: {},
				variables: [],
				environments: [
					{
						id: "local",
						name: "Local",
						values: { baseUrl: "http://localhost:5257", authorization: "local-token" },
					},
					{
						id: "staging",
						name: "Staging",
						values: { baseUrl: "https://staging.example.com", authorization: "staging-token" },
					},
				],
			},
			SECRETS,
		);

		const presets = JSON.parse(fs.readFileSync(presetFile(), "utf8"));
		const secrets = JSON.parse(fs.readFileSync(secretFile(), "utf8"));

		expect(presets.environments.map((environment: { name: string }) => environment.name)).toEqual([
			"Local",
			"Staging",
		]);
		expect(presets.environments[1].values).toEqual({ baseUrl: "https://staging.example.com" });
		expect(JSON.stringify(presets)).not.toContain("staging-token");
		expect(secrets[projectPath].staging).toEqual({ authorization: "staging-token" });
		expectOwnerOnlyWhereTheFilesystemCarriesModes(secretFile());
	});

	it("hands back each environment with its secrets merged in, and remembers the active one", async () => {
		await saveEnvironments(
			projectPath,
			{
				activeId: "staging",
				names: {},
				variables: [],
				environments: [
					{ id: "local", name: "Local", values: { baseUrl: "http://localhost:5257" } },
					{
						id: "staging",
						name: "Staging",
						values: { baseUrl: "https://staging.example.com", authorization: "staging-token" },
					},
				],
			},
			SECRETS,
		);

		const set = await readEnvironments(projectPath);

		expect(set.activeId).toBe("staging");
		expect(set.environments[1].values).toEqual({
			baseUrl: "https://staging.example.com",
			authorization: "staging-token",
		});
		expect(set.environments[0].values).toEqual({ baseUrl: "http://localhost:5257" });
	});

	it("keeps one project's environments away from another's", async () => {
		const other = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "lazify-api-env-other-")));

		await saveEnvironments(
			projectPath,
			{
				activeId: "local",
				names: {},
				variables: [],
				environments: [{ id: "local", name: "Local", values: { authorization: "mine" } }],
			},
			SECRETS,
		);

		expect((await readEnvironments(other)).environments[0].values).toEqual({});

		fs.rmSync(other, { recursive: true, force: true });
	});

	it("carries a value an earlier build stored under the name the policy used to invent", async () => {
		fs.writeFileSync(
			secretFile(),
			JSON.stringify({ [projectPath]: { bearerToken: "carried-over" } }),
			"utf8",
		);

		expect((await readEnvironments(projectPath)).environments[0].values).toEqual({
			authorization: "carried-over",
		});
	});

	it("drops a value that was cleared rather than storing an empty one", async () => {
		await saveEnvironments(
			projectPath,
			{
				activeId: "local",
				names: {},
				variables: [],
				environments: [
					{ id: "local", name: "Local", values: { baseUrl: "http://localhost", authorization: "x" } },
				],
			},
			SECRETS,
		);

		const set = await saveEnvironments(
			projectPath,
			{
				activeId: "local",
				names: {},
				variables: [],
				environments: [
					{ id: "local", name: "Local", values: { baseUrl: "http://localhost", authorization: "" } },
				],
			},
			SECRETS,
		);

		expect(set.environments[0].values).toEqual({ baseUrl: "http://localhost" });
	});
});
