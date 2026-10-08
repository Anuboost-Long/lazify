/**
 * An id for something a window holds — a tab, a panel — unique for as long as
 * the window is open.
 *
 * The clock keeps ids ordered and readable in a log; the random tail keeps two
 * made in the same millisecond apart. The tail comes from the platform's
 * generator rather than `Math.random`, which is the one every static analyser
 * asks about and costs nothing to avoid.
 */
export function uniqueId(prefix: string): string {
	const tail = new Uint8Array(3);
	globalThis.crypto.getRandomValues(tail);

	const suffix = Array.from(tail, (byte) => byte.toString(16).padStart(2, "0")).join("");

	return `${prefix}-${Date.now()}-${suffix}`;
}
