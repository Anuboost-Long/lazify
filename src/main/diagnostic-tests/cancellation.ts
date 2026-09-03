import { RunCancelled } from "./errors";

export function throwIfCancelled(signal: AbortSignal): void {
	if (signal.aborted) throw new RunCancelled();
}

export function delay(milliseconds: number, signal: AbortSignal): Promise<void> {
	throwIfCancelled(signal);

	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			signal.removeEventListener("abort", onAbort);
			resolve();
		}, milliseconds);

		function onAbort() {
			clearTimeout(timer);
			reject(new RunCancelled());
		}

		signal.addEventListener("abort", onAbort, { once: true });
	});
}

export async function pollUntil(
	condition: () => Promise<boolean>,
	timeoutMs: number,
	signal: AbortSignal,
	intervalMs = 150,
): Promise<boolean> {
	const deadline = Date.now() + timeoutMs;

	for (;;) {
		throwIfCancelled(signal);
		if (await condition()) return true;
		if (Date.now() >= deadline) return false;

		await delay(Math.min(intervalMs, Math.max(0, deadline - Date.now())), signal);
	}
}
