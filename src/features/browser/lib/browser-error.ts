export type BrowserErrorKind =
  | "no-internet"
  | "site-not-found"
  | "site-unreachable"
  | "insecure-certificate"
  | "blocked"
  | "page-crashed"
  | "unknown";

export interface BrowserError {
  kind: BrowserErrorKind;
  url: string;
  code: number;
  /** Chromium's name for it, e.g. `ERR_NAME_NOT_RESOLVED`. */
  description: string;
}

/** Stopped or superseded, not failed. */
const ERR_ABORTED = -3;

const FIRST_CERTIFICATE_CODE = -219;
const LAST_CERTIFICATE_CODE = -200;

const KIND_BY_CODE: Record<number, BrowserErrorKind> = {
  [-7]: "site-unreachable", // ERR_TIMED_OUT
  [-15]: "site-unreachable", // ERR_SOCKET_NOT_CONNECTED
  [-20]: "blocked", // ERR_BLOCKED_BY_CLIENT
  [-21]: "no-internet", // ERR_NETWORK_CHANGED
  [-22]: "blocked", // ERR_BLOCKED_BY_ADMINISTRATOR
  [-27]: "blocked", // ERR_BLOCKED_BY_RESPONSE
  [-30]: "blocked", // ERR_BLOCKED_BY_CSP
  [-49]: "blocked", // ERR_UNSAFE_REDIRECT
  [-100]: "site-unreachable", // ERR_CONNECTION_CLOSED
  [-101]: "site-unreachable", // ERR_CONNECTION_RESET
  [-102]: "site-unreachable", // ERR_CONNECTION_REFUSED
  [-104]: "site-unreachable", // ERR_CONNECTION_FAILED
  [-105]: "site-not-found", // ERR_NAME_NOT_RESOLVED
  [-106]: "no-internet", // ERR_INTERNET_DISCONNECTED
  [-107]: "insecure-certificate", // ERR_SSL_PROTOCOL_ERROR
  [-109]: "site-unreachable", // ERR_ADDRESS_UNREACHABLE
  [-110]: "insecure-certificate", // ERR_SSL_CLIENT_AUTH_CERT_NEEDED
  [-113]: "insecure-certificate", // ERR_SSL_VERSION_OR_CIPHER_MISMATCH
  [-118]: "site-unreachable", // ERR_CONNECTION_TIMED_OUT
  [-137]: "site-not-found", // ERR_NAME_RESOLUTION_FAILED
  [-138]: "blocked", // ERR_NETWORK_ACCESS_DENIED
  [-310]: "site-unreachable", // ERR_TOO_MANY_REDIRECTS
  [-312]: "blocked", // ERR_UNSAFE_PORT
  [-324]: "site-unreachable", // ERR_EMPTY_RESPONSE
  [-501]: "insecure-certificate" // ERR_INSECURE_RESPONSE
};

const NAME_BY_CODE: Record<number, string> = {
  [-7]: "ERR_TIMED_OUT",
  [-20]: "ERR_BLOCKED_BY_CLIENT",
  [-21]: "ERR_NETWORK_CHANGED",
  [-102]: "ERR_CONNECTION_REFUSED",
  [-105]: "ERR_NAME_NOT_RESOLVED",
  [-106]: "ERR_INTERNET_DISCONNECTED",
  [-118]: "ERR_CONNECTION_TIMED_OUT",
  [-137]: "ERR_NAME_RESOLUTION_FAILED"
};

export function isAbortedLoad(code: number): boolean {
  return code === ERR_ABORTED;
}

/**
 * Being offline outranks the code: with no network, DNS fails exactly as a
 * mistyped host does, and "check the spelling" would be the wrong thing to say.
 */
export function classifyLoadError(code: number, isOnline = true): BrowserErrorKind {
  if (!isOnline) return "no-internet";

  if (code <= LAST_CERTIFICATE_CODE && code >= FIRST_CERTIFICATE_CODE) {
    return "insecure-certificate";
  }

  return KIND_BY_CODE[code] ?? "unknown";
}

export function netErrorName(code: number): string {
  return NAME_BY_CODE[code] ?? "";
}
