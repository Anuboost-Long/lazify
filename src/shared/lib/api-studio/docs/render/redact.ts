import type { RequestHeader } from "../../runner/types";

const SECRET_HEADERS = new Set([
	"authorization",
	"proxy-authorization",
	"cookie",
	"set-cookie",
	"x-api-key",
	"api-key",
	"apikey",
	"x-auth-token",
	"auth-token",
	"x-access-token",
	"access-token",
	"x-csrf-token",
	"x-xsrf-token",
	"x-session-token",
	"x-signature",
	"x-secret",
]);

const SECRET_NAME =
	/(token|password|passcode|secret|api[-_]?key|authorization|credential|signature|refresh|otp|pin)/i;
const JWT = /^ey[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\./;
const OPAQUE = /^[A-Za-z0-9+/=_\-.%]+$/;

export const HIDDEN = "<hidden>";

function looksSecret(value: string): boolean {
	if (value.length < 32 || /\s/.test(value) || value.includes("://")) return false;
	if (JWT.test(value)) return true;
	if (!OPAQUE.test(value)) return false;

	return !value.includes("/") || /(=|%3D)$/i.test(value);
}

function placeholderFor(name: string, value: string): string {
	const [scheme] = value.split(" ");

	if (/^bearer$/i.test(scheme)) return "Bearer <token>";
	if (/^basic$/i.test(scheme)) return "Basic <credentials>";

	return `<${name.toLowerCase()}>`;
}

export function redactHeaders(headers: RequestHeader[]): RequestHeader[] {
	return headers.map((header) => {
		const name = header.name.toLowerCase();

		if (!SECRET_HEADERS.has(name) && !SECRET_NAME.test(name) && !looksSecret(header.value ?? "")) {
			return header;
		}

		return { ...header, value: placeholderFor(header.name, header.value ?? "") };
	});
}

export function redactUrl(url: string): string {
	const split = url.indexOf("?");

	if (split === -1) return url;

	const query = url
		.slice(split + 1)
		.split("&")
		.map((pair) => {
			const equals = pair.indexOf("=");

			if (equals === -1) return pair;

			const name = pair.slice(0, equals);
			const value = pair.slice(equals + 1);

			return SECRET_NAME.test(name) || looksSecret(value) ? `${name}=<${name.toLowerCase()}>` : pair;
		})
		.join("&");

	return `${url.slice(0, split)}?${query}`;
}

function redactValue(key: string, value: unknown): unknown {
	if (typeof value === "string") {
		return SECRET_NAME.test(key) || looksSecret(value) ? HIDDEN : value;
	}

	if (Array.isArray(value)) return value.map((entry) => redactValue(key, entry));

	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value).map(([name, held]) => [name, redactValue(name, held)]),
		);
	}

	return value;
}

export function redactBody(text: string): string {
	const body = text.trim();

	if (!body) return text;

	try {
		return JSON.stringify(redactValue("", JSON.parse(body)), null, 2);
	} catch {
		return body
			.replace(
				/((?:token|password|secret|api[-_]?key|authorization|signature)"?\s*[:=]\s*"?)([^"&\s]+)/gi,
				(_match, prefix: string) => `${prefix}${HIDDEN}`,
			)
			.replace(/\bey[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]+/g, HIDDEN);
	}
}
