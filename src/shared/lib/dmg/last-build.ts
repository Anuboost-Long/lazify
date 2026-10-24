const LAST_BUILD_KEY = "lazify-dmg-last-build";

export interface LastDmgBuild {
	appName: string;
	builtAt: string;
}

/** The last disk image built, so the Tools page can say when the builder was last used. */
export function readLastDmgBuild(): LastDmgBuild | null {
	try {
		const parsed: unknown = JSON.parse(globalThis.localStorage.getItem(LAST_BUILD_KEY) ?? "null");
		if (!parsed || typeof parsed !== "object") return null;

		const { appName, builtAt } = parsed as Partial<LastDmgBuild>;
		return typeof appName === "string" && typeof builtAt === "string" ? { appName, builtAt } : null;
	} catch {
		return null;
	}
}

export function rememberDmgBuild(build: LastDmgBuild) {
	globalThis.localStorage.setItem(LAST_BUILD_KEY, JSON.stringify(build));
}
