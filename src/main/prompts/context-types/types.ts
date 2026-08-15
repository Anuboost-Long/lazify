export type ContextTypeId = "rule" | "fact" | "command" | "path";

/** Where a type's line lands in the prompt. */
export type ContextSection = "context" | "rules";

export type ContextFieldKind = "text" | "textarea" | "select";

export interface ContextField {
  name: string;
  /** Translation keys — the form calls t() itself. */
  label: string;
  placeholder: string;
  kind: ContextFieldKind;
  required?: boolean;
  /** For `select`: the values it may take, in order. */
  options?: string[];
}

/**
 * A kind of context, and the shape the user fills in for it.
 *
 * Typing context is what keeps a prompt unambiguous. A rule written as free
 * prose can mean anything; the same rule typed as strength, action, condition
 * and reason renders the same way every time, and an agent reading it never has
 * to guess which part was the instruction.
 */
export interface ContextType {
  id: ContextTypeId;
  label: string;
  description: string;
  section: ContextSection;
  fields: ContextField[];
  /** The one line this entry contributes to a prompt. */
  render: (payload: ContextPayload) => string;
}

export type ContextPayload = Record<string, string>;

export function field(payload: ContextPayload, name: string): string {
  return (payload[name] ?? "").trim();
}

/** Sentence-cases a fragment the user typed in the middle of a phrase. */
export function sentence(text: string): string {
  if (!text) return "";
  return text[0].toUpperCase() + text.slice(1);
}

/** Trims a trailing full stop so a rendered line can add its own punctuation. */
export function bare(text: string): string {
  return text.replace(/[.\s]+$/, "");
}
