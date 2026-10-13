import { currentArch, currentOs, environmentVariable, existingFiles } from "@/platform/exec";

import { nvmScriptCandidates } from "./tools/nvm-shell";
import { LINUX_PACKAGE_MANAGER_FILES } from "./tools/package-managers";

export type HostPlatform = "darwin" | "win32" | "linux";

/**
 * What Electron's environment code read synchronously from Node — the platform,
 * the home folder, a few variables and whether a few files exist. Here each is
 * an async question, so `prepareHost()` asks them all before a tool is probed
 * and the tool modules keep their synchronous shape.
 */
export const host = {
	platform: "darwin" as HostPlatform,
	arch: "arm64" as "arm64" | "x64",
	homedir: "",
	env: {} as { NVM_DIR?: string; COMSPEC?: string },
	files: new Set<string>(),
};

export const existsSync = (path: string) => host.files.has(path);

/** The platform and variables once; the files every time, since installing nvm adds one. */
let settled: Promise<void> | null = null;

export async function prepareHost(): Promise<void> {
	settled ??= (async () => {
		const [os, arch, home, nvmDir, comspec] = await Promise.all([
			currentOs(),
			currentArch(),
			environmentVariable("HOME"),
			environmentVariable("NVM_DIR"),
			environmentVariable("COMSPEC"),
		]);

		host.platform = os === "windows" ? "win32" : "darwin";
		host.arch = arch;
		host.homedir = home ?? "";
		host.env = { NVM_DIR: nvmDir ?? undefined, COMSPEC: comspec ?? undefined };
	})();
	await settled;

	host.files = await existingFiles([...nvmScriptCandidates(), ...LINUX_PACKAGE_MANAGER_FILES]);
}
