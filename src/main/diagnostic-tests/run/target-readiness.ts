import { pollUntil } from "../cancellation";

async function responds(url: string): Promise<boolean> {
	try {
		await fetch(url, { method: "GET", signal: AbortSignal.timeout(3000), redirect: "manual" });
		return true;
	} catch {
		return false;
	}
}

export function waitForTarget(
	url: string,
	timeoutMs: number,
	signal: AbortSignal,
): Promise<boolean> {
	return pollUntil(() => responds(url), timeoutMs, signal, 500);
}
