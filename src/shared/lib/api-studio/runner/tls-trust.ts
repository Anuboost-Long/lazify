/**
 * A dev certificate is trusted by adding it to the machine's own store,
 * which a plain HTTP client does not read. Verification is relaxed for
 * the loopback interface only (`desktop.http`'s `trustLoopbackCertificates`,
 * chain-sdk request 19), so this is the line that decides whether a
 * request is checked at all.
 */
export function isLoopbackHost(hostname: string): boolean {
	const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

	return (
		host === "localhost" ||
		host.endsWith(".localhost") ||
		host === "::1" ||
		host === "0.0.0.0" ||
		/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)
	);
}
