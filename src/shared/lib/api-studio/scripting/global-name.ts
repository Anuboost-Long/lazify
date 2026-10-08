const RESERVED = new Set([
  "JSON",
  "Math",
  "Date",
  "URL",
  "URLSearchParams",
  "TextEncoder",
  "TextDecoder",
  "encodeURIComponent",
  "decodeURIComponent",
  "encodeURI",
  "decodeURI",
  "atob",
  "btoa",
  "globalThis",
  "undefined",
  "null",
  "true",
  "false"
]);

export const DEFAULT_SCRIPT_GLOBAL = "lz";

export function isUsableGlobal(name: string): boolean {
  return /^[A-Za-z_$][\w$]*$/.test(name) && !RESERVED.has(name);
}
