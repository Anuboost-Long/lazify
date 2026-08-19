import { MATCHERS, membersAt, type ApiNode, type ScriptPhase } from "./catalog";
import { COMMON_MEMBERS, JS_GLOBALS, jsNamespace } from "./javascript";
import { catalogFor } from "./postman";

export interface Suggestion {
  label: string;
  signature: string | null;
  detail: string;
  insert: string;
  caretBack: number;
}

function suggestionOf(node: ApiNode): Suggestion {
  const takesArguments = node.kind === "method" && node.signature !== "()";

  return {
    label: node.name,
    signature: node.signature,
    detail: node.detail,
    insert: node.kind === "method" ? `${node.name}()` : node.name,
    caretBack: takesArguments ? 1 : 0
  };
}

export interface SuggestionContext {
  partial: string;
  items: Suggestion[];
}

export interface SuggestionSource {
  responseBody?: string | null;
  declaredBody?: string | null;
  variableNames?: string[];
  requestHeaderNames?: string[];
  responseHeaderNames?: string[];
}

const IDENTIFIER_PATH = /([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*)\s*$/;
const PATH_BEFORE_CARET = /([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\.?)$/;
const ENV_ARGUMENT =
  /([A-Za-z_$][\w$]*)\s*\.\s*(?:env|environment)\s*\.\s*(?:get|set|has|unset)\s*\(\s*["'`]([\w.$-]*)$/;
const HEADER_ARGUMENT =
  /([A-Za-z_$][\w$]*)\s*\.\s*(request|response)\s*\.\s*headers\s*\.\s*(?:get|set|has|remove)\s*\(\s*["'`]([\w-]*)$/i;
const TAIL_AFTER_CALL = /\)((?:\s*\.\s*[A-Za-z_$][\w$]*)*\s*\.\s*[A-Za-z_$][\w$]*|(?:\s*\.\s*[A-Za-z_$][\w$]*)*\s*\.)$/;

function calleeOf(text: string, closeIndex: number): string | null {
  let depth = 0;

  for (let index = closeIndex; index >= 0; index -= 1) {
    const character = text[index];

    if (character === ")") depth += 1;
    else if (character === "(") {
      depth -= 1;
      if (depth === 0) return IDENTIFIER_PATH.exec(text.slice(0, index))?.[1].replace(/\s+/g, "") ?? null;
    }
  }

  return null;
}

function segmentsOf(tail: string): { path: string[]; partial: string } {
  const parts = tail
    .split(".")
    .slice(1)
    .map((part) => part.trim());
  const partial = parts.pop() ?? "";

  return { path: parts, partial };
}

function readable(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return `array of ${value.length}`;
  if (typeof value === "object") return "object";
  if (typeof value === "string") return value.length > 40 ? `"${value.slice(0, 40)}…"` : `"${value}"`;

  return String(value);
}

function walkJson(body: string, path: string[]): unknown {
  let value: unknown;

  try {
    value = JSON.parse(body);
  } catch {
    return undefined;
  }

  for (const key of path) {
    const holder = Array.isArray(value) ? value[0] : value;

    if (!holder || typeof holder !== "object") return undefined;

    value = (holder as Record<string, unknown>)[key];
  }

  return value;
}

function jsonSuggestions(body: string | null | undefined, path: string[], partial: string): Suggestion[] {
  if (!body) return [];

  const value = walkJson(body, path);
  const holder = Array.isArray(value) ? value[0] : value;

  if (!holder || typeof holder !== "object") return [];

  return Object.entries(holder as Record<string, unknown>)
    .filter(([key]) => key.startsWith(partial))
    .slice(0, 50)
    .map(([key, held]) => ({
      label: key,
      signature: null,
      detail: readable(held),
      insert: key,
      caretBack: 0
    }));
}

function jsonAliases(source: string, globalName: string): Set<string> {
  const pattern = new RegExp(
    `(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*(?:${globalName}|lz)\\s*\\.\\s*response\\s*\\.\\s*json\\s*\\(\\s*\\)`,
    "g"
  );
  const names = new Set<string>();
  let found = pattern.exec(source);

  while (found) {
    names.add(found[1]);
    found = pattern.exec(source);
  }

  return names;
}

const KEYWORDS = new Set([
  "const","let","var","if","else","for","while","do","return","function","new","typeof","instanceof",
  "true","false","null","undefined","try","catch","finally","throw","switch","case","break","continue",
  "of","in","this","class","extends","await","async","delete","void","yield"
]);

const WORD = /[A-Za-z_$][\w$]*/g;
const NOT_CODE = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g;
const MAX_WORDS = 20;

function documentWords(source: string, partial: string): Suggestion[] {
  const seen = new Set<string>();

  for (const word of source.replace(NOT_CODE, " ").match(WORD) ?? []) {
    if (word === partial || KEYWORDS.has(word) || !word.startsWith(partial)) continue;

    seen.add(word);
  }

  return Array.from(seen)
    .sort((left, right) => left.toLowerCase().localeCompare(right.toLowerCase()))
    .slice(0, MAX_WORDS)
    .map((word) => ({
      label: word,
      signature: null,
      detail: "in this script",
      insert: word,
      caretBack: 0
    }));
}

function nameSuggestions(names: string[], partial: string, detail: string): Suggestion[] {
  const wanted = partial.toLowerCase();

  return Array.from(new Set(names))
    .filter((name) => name.toLowerCase().startsWith(wanted))
    .sort((left, right) => left.localeCompare(right))
    .map((name) => ({ label: name, signature: null, detail, insert: name, caretBack: 0 }));
}

function starting(nodes: ApiNode[], partial: string): ApiNode[] {
  return nodes.filter((node) => node.name !== partial && node.name.startsWith(partial));
}

function unresolved(source: string, partial: string): Suggestion[] {
  return [...documentWords(source, partial), ...starting(COMMON_MEMBERS, partial).map(suggestionOf)];
}

function globalSuggestion(globalName: string): Suggestion {
  return {
    label: globalName,
    signature: null,
    detail: "Everything a script can reach.",
    insert: globalName,
    caretBack: 0
  };
}

function isApiRoot(name: string, globalName: string) {
  return name === globalName || name === "lz";
}

export function suggestionsFor(
  source: string,
  caret: number,
  globalName: string,
  phase: ScriptPhase,
  known: SuggestionSource = {}
): SuggestionContext {
  const before = source.slice(0, caret);
  const shapeBody = known.responseBody ?? known.declaredBody ?? null;
  const named = ENV_ARGUMENT.exec(before);

  if (named && isApiRoot(named[1], globalName)) {
    return {
      partial: named[2],
      items: nameSuggestions(known.variableNames ?? [], named[2], "environment value")
    };
  }

  const header = HEADER_ARGUMENT.exec(before);

  if (header && isApiRoot(header[1], globalName)) {
    const sent = header[2].toLowerCase() === "request";

    return {
      partial: header[3],
      items: nameSuggestions(
        (sent ? known.requestHeaderNames : known.responseHeaderNames) ?? [],
        header[3],
        sent ? "this route declares it" : "the response sent it"
      )
    };
  }

  const afterCall = TAIL_AFTER_CALL.exec(before);

  if (afterCall) {
    const callee = calleeOf(before, before.length - afterCall[1].length - 1);
    const { path, partial } = segmentsOf(afterCall[1]);

    if (callee && /(^|\.)expect$/.test(callee) && isApiRoot(callee.split(".")[0], globalName)) {
      return {
        partial,
        items: starting(MATCHERS, partial).map(suggestionOf)
      };
    }

    if (callee && /\.response\.json$/.test(callee) && isApiRoot(callee.split(".")[0], globalName)) {
      const shape = jsonSuggestions(shapeBody, path, partial);

      return { partial, items: shape.length > 0 ? shape : unresolved(source, partial) };
    }

    return { partial, items: unresolved(source, partial) };
  }

  const path = PATH_BEFORE_CARET.exec(before);
  if (!path) return { partial: "", items: [] };

  const endsWithDot = path[1].endsWith(".");
  const owner = (endsWithDot ? path[1].slice(0, -1) : path[1]).split(".");
  const partial = endsWithDot ? "" : (owner.pop() ?? "");

  if (owner.length === 0) {
    const named =
      globalName.startsWith(partial) && partial !== globalName ? [globalSuggestion(globalName)] : [];

    return {
      partial,
      items: [
        ...named,
        ...documentWords(source, partial),
        ...starting(JS_GLOBALS, partial).map(suggestionOf)
      ]
    };
  }

  if (jsonAliases(source, globalName).has(owner[0])) {
    const shape = jsonSuggestions(shapeBody, owner.slice(1), partial);

    return { partial, items: shape.length > 0 ? shape : unresolved(source, partial) };
  }

  const standard = owner.length === 1 ? jsNamespace(owner[0]) : null;

  if (standard) {
    return { partial, items: starting(standard.members ?? [], partial).map(suggestionOf) };
  }

  if (!isApiRoot(owner[0], globalName)) {
    return { partial, items: unresolved(source, partial) };
  }

  return {
    partial,
    items: starting(
      membersAt(owner.slice(1), phase, catalogFor(owner[0], globalName)),
      partial
    ).map(suggestionOf)
  };
}

