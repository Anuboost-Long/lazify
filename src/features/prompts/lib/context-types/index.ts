import { commandType } from "./command";
import { factType } from "./fact";
import { pathType } from "./path";
import { ruleType } from "./rule";
import type { ContextPayload, ContextType } from "./types";

/** Picker order. A new kind of context is one file and one line here. */
export const CONTEXT_TYPES: ContextType[] = [ruleType, factType, commandType, pathType];

export function contextType(id: string): ContextType {
	return CONTEXT_TYPES.find((type) => type.id === id) ?? ruleType;
}

/** The single line an entry contributes to a prompt. */
export function renderContext(id: string, payload: ContextPayload): string {
	return contextType(id).render(payload);
}

export { commandType, factType, pathType, ruleType };
export { RULE_STRENGTHS } from "./rule";
export type { ContextField, ContextSection, ContextTypeId } from "./types";
export type { ContextPayload, ContextType };
