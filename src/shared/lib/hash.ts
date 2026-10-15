/**
 * The webview has no `node:crypto`, and `SubtleCrypto.digest` is async-only —
 * callers that need a short, deterministic, non-secret id (never a security
 * boundary) use this synchronous 64-bit digest (two 32-bit FNV-1a lanes)
 * instead of a truncated SHA-1/SHA-256.
 */
export function stableDigest(text: string): string {
	let hi = 0x811c9dc5;
	let lo = 0xc2b2ae35;

	for (let index = 0; index < text.length; index += 1) {
		const code = text.codePointAt(index) ?? 0;
		hi = Math.imul(hi ^ code, 0x01000193) >>> 0;
		lo = Math.imul(lo ^ code, 0x85ebca6b) >>> 0;
	}

	return hi.toString(16).padStart(8, "0") + lo.toString(16).padStart(8, "0");
}
