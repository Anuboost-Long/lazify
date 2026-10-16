import type { BrowserViewLoadFailureReason } from "@chain/sdk";

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
  /** The engine's own wording, e.g. "A server with the specified hostname could not be found." */
  description: string;
}

/** WebKit's reasons, already sorted by Chain: its codes differ by OS and are never branched on. */
const KIND_BY_REASON: Record<BrowserViewLoadFailureReason, BrowserErrorKind> = {
  offline: "no-internet",
  "host-not-found": "site-not-found",
  unreachable: "site-unreachable",
  "insecure-connection": "insecure-certificate",
  blocked: "blocked",
  other: "unknown"
};

/**
 * Being offline outranks the reason: with no network, DNS fails exactly as a
 * mistyped host does, and "check the spelling" would be the wrong thing to say.
 */
export function classifyLoadError(reason: BrowserViewLoadFailureReason, isOnline = true): BrowserErrorKind {
  if (!isOnline) return "no-internet";

  return KIND_BY_REASON[reason];
}
