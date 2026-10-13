import { desktop, type ChainError } from "@chain/sdk";

export type PackageProgress = (received: number, total: number | null) => void;

/** Downloads a `.vsix` into its own package folder, checked against `sha256`. */
export async function installPackage(id: string, url: string, sha256: string, onProgress: PackageProgress) {
	await desktop.packages.install({ id, url, sha256, archive: "zip" }, onProgress);
}

/** The absolute path of `file` inside package `id`, or null when either isn't installed. */
export async function packageFile(id: string, file: string): Promise<string | null> {
	try {
		return await desktop.packages.resolve(id, file);
	} catch (error) {
		if ((error as Partial<ChainError> | null)?.code === "NOT_FOUND") return null;
		throw error;
	}
}

export const removePackage = (id: string) => desktop.packages.remove(id);
