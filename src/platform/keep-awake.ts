import { desktop } from "@chain/sdk";

import { appDataPath, readTextFile, writeTextFile } from "./folders";

const STORE_FILE = "keep-awake.json";
const REASON = "Lazify: an agent is working";

async function storePath() {
	return `${await appDataPath()}/${STORE_FILE}`;
}

export async function keepAwake(): Promise<boolean> {
	try {
		const parsed = JSON.parse((await readTextFile(await storePath())) ?? "") as { enabled?: boolean };

		return parsed.enabled !== false;
	} catch {
		return true;
	}
}

const busyRuns = new Set<string>();
let enabled: boolean | null = null;
let holding = false;

async function sync() {
	enabled ??= await keepAwake();
	const shouldHold = enabled && busyRuns.size > 0;

	if (shouldHold && !holding) {
		holding = true;
		await desktop.keepAwake.start(REASON);
	} else if (!shouldHold && holding) {
		holding = false;
		await desktop.keepAwake.stop();
	}
}

export async function setKeepAwake(next: boolean): Promise<boolean> {
	await writeTextFile(await storePath(), JSON.stringify({ enabled: next }, null, 2));
	enabled = next;
	await sync();

	return next;
}

export function setAgentBusy(runId: string, busy: boolean): void {
	if (busy) busyRuns.add(runId);
	else busyRuns.delete(runId);

	void sync().catch(() => undefined);
}
