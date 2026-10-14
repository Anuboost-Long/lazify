import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

import { nodeFolders } from "../../../platform/node-folders";

let platform = "macos";

vi.mock("@chain/sdk", () => ({ desktop: { folders: nodeFolders } }));
vi.mock("@/platform/exec", () => ({ currentOs: async () => platform }));

const { bundleProblem, directorySize, fileSafe, findBundleIcon } = await import("@/shared/lib/dmg/bundle");

const base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "lazify-dmg-bundle-")));

afterAll(() => fs.rm(base, { recursive: true, force: true }));

async function makeBundle(name: string, { withMacOS = true, icon = null as string | null } = {}) {
	const appPath = path.join(base, name);

	await fs.mkdir(path.join(appPath, "Contents", "Resources"), { recursive: true });
	if (withMacOS) await fs.mkdir(path.join(appPath, "Contents", "MacOS"), { recursive: true });
	if (icon) await fs.writeFile(path.join(appPath, "Contents", "Resources", icon), "icon");

	return appPath;
}

describe("bundleProblem", () => {
	it("refuses outside macOS", async () => {
		platform = "windows";
		const appPath = await makeBundle("Windows.app");

		expect(await bundleProblem(appPath)).toBe("Disk images can only be built on macOS.");
		platform = "macos";
	});

	it("refuses a path that does not exist", async () => {
		expect(await bundleProblem(path.join(base, "Nowhere.app"))).toBe("That app could not be found.");
	});

	it("refuses something that is not a .app", async () => {
		const file = path.join(base, "notes.txt");

		await fs.writeFile(file, "hi");

		expect(await bundleProblem(file)).toBe("Pick a macOS .app bundle.");
	});

	it("refuses a folder named .app with no MacOS directory inside", async () => {
		const appPath = await makeBundle("Empty.app", { withMacOS: false });

		expect(await bundleProblem(appPath)).toBe("That folder is named .app but is not an app bundle.");
	});

	it("accepts a real bundle", async () => {
		const appPath = await makeBundle("Real.app");

		expect(await bundleProblem(appPath)).toBeNull();
	});
});

describe("directorySize", () => {
	it("adds up every file in the tree", async () => {
		const appPath = await makeBundle("Sized.app");

		await fs.writeFile(path.join(appPath, "Contents", "MacOS", "main"), "x".repeat(100));
		await fs.writeFile(path.join(appPath, "Contents", "Resources", "icon.icns"), "y".repeat(50));

		expect(await directorySize(appPath)).toBe(150);
	});

	it("answers 0 for a folder that is not there", async () => {
		expect(await directorySize(path.join(base, "Nowhere.app"))).toBe(0);
	});
});

describe("findBundleIcon", () => {
	it("prefers the icon CFBundleIconFile names", async () => {
		const appPath = await makeBundle("Named.app");

		await fs.writeFile(path.join(appPath, "Contents", "Resources", "AppIcon.icns"), "a");
		await fs.writeFile(path.join(appPath, "Contents", "Resources", "Other.icns"), "b");

		expect(await findBundleIcon(appPath, { CFBundleIconFile: "AppIcon" })).toBe(
			path.join(appPath, "Contents", "Resources", "AppIcon.icns"),
		);
	});

	it("falls back to any .icns when none is named", async () => {
		const appPath = await makeBundle("Unnamed.app", { icon: "Found.icns" });

		expect(await findBundleIcon(appPath, {})).toBe(path.join(appPath, "Contents", "Resources", "Found.icns"));
	});

	it("answers null when there is no icon at all", async () => {
		const appPath = await makeBundle("NoIcon.app");

		expect(await findBundleIcon(appPath, {})).toBeNull();
	});

	it("never descends into a Resources subfolder", async () => {
		const appPath = await makeBundle("Nested.app");

		await fs.mkdir(path.join(appPath, "Contents", "Resources", "nested"), { recursive: true });
		await fs.writeFile(path.join(appPath, "Contents", "Resources", "nested", "deep.icns"), "x");

		expect(await findBundleIcon(appPath, {})).toBeNull();
	});
});

describe("fileSafe", () => {
	it("strips characters a filename cannot carry", () => {
		expect(fileSafe('My/App: "Edition"?')).toBe("MyApp Edition");
	});

	it("collapses runs of whitespace", () => {
		expect(fileSafe("My   App")).toBe("My App");
	});
});
