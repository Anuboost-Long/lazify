import type { FormEntry } from "./types";

function parsed(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function formattedJson(text: string): string {
  if (!text.trim()) return "";

  const value = parsed(text);

  return value === undefined ? text : JSON.stringify(value, null, 2);
}

export function isValidJson(text: string): boolean {
  return !text.trim() || parsed(text) !== undefined;
}

export function entriesFromJson(text: string): FormEntry[] {
  const value = parsed(text);

  if (!value || typeof value !== "object" || Array.isArray(value)) return [];

  return Object.entries(value).map(([name, fieldValue]) => ({
    name,
    value: typeof fieldValue === "object" ? JSON.stringify(fieldValue) : String(fieldValue ?? "")
  }));
}
