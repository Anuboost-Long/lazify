const MASK = "[redacted]";

const CREDENTIAL_KEYS = [
	"api[_-]?key",
	"access[_-]?token",
	"refresh[_-]?token",
	"client[_-]?secret",
	"password",
	"passwd",
	"secret",
];

const CREDENTIAL_VALUE = String.raw`\s*[:=]\s*(?:"[^"]*"|'[^']*'|\S+)`;

const HEADER_PATTERNS = [
	/\b((?:proxy-)?authorization)\s*[:=]\s*[^\n]+/gi,
	/\b((?:set-)?cookie)\s*[:=]\s*[^\n]+/gi,
];

const TOKEN_PATTERNS = [
	/\bBearer\s+[A-Za-z0-9._~+/-]{12,}=*/g,
	/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+/g,
];

const CREDENTIAL_PATTERNS = CREDENTIAL_KEYS.map(
	(key) => new RegExp(String.raw`\b(${key})\b${CREDENTIAL_VALUE}`, "gi"),
);

const PATTERNS = [...HEADER_PATTERNS, ...CREDENTIAL_PATTERNS, ...TOKEN_PATTERNS];

function escapeForRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

function maskMatch(match: string, key: unknown): string {
	if (typeof key !== "string" || !match.startsWith(key)) return MASK;

	return `${key}: ${MASK}`;
}

export function createRedactor(secretValues: readonly string[]) {
	const literals = Array.from(new Set(secretValues.filter((value) => value.length >= 4)))
		.sort((left, right) => right.length - left.length)
		.map((value) => new RegExp(escapeForRegExp(value), "g"));

	return function redact(text: string): string {
		if (!text) return text;

		const withoutSecrets = literals.reduce((masked, literal) => masked.replace(literal, MASK), text);

		return PATTERNS.reduce((masked, pattern) => masked.replace(pattern, maskMatch), withoutSecrets);
	};
}

export type Redactor = ReturnType<typeof createRedactor>;
