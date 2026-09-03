import { FlowError } from "../errors";

const ABSOLUTE_URL = /^[a-z][a-z\d+\-.]*:\/\//i;

export function resolveUrl(baseUrl: string, target: string): string {
	if (ABSOLUTE_URL.test(target)) return target;

	if (!baseUrl) {
		throw new FlowError(
			`"${target}" is relative but no base url is set — set start.url or config baseUrl`,
		);
	}

	return new URL(target, baseUrl).toString();
}
