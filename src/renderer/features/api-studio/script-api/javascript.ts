import type { ApiNode, ScriptPhase } from "./catalog";

const BOTH: ScriptPhase[] = ["pre", "post"];

function fn(name: string, signature: string, detail: string): ApiNode {
  return { name, kind: "method", signature, detail, phases: BOTH };
}

function group(name: string, detail: string, members: ApiNode[]): ApiNode {
  return { name, kind: "namespace", signature: null, detail, phases: BOTH, members };
}

export const JS_GLOBALS: ApiNode[] = [
  group("JSON", "Text to values and back.", [
    fn("parse", "(text)", "Reads JSON text into a value. Throws on anything else."),
    fn("stringify", "(value, null, 2)", "Writes a value as JSON text.")
  ]),
  group("Math", "Numbers.", [
    fn("round", "(n)", "To the nearest whole number."),
    fn("floor", "(n)", "Down to a whole number."),
    fn("ceil", "(n)", "Up to a whole number."),
    fn("abs", "(n)", "Without its sign."),
    fn("min", "(a, b)", "The smaller one."),
    fn("max", "(a, b)", "The larger one."),
    fn("random", "()", "Between 0 and 1.")
  ]),
  group("Object", "Working over a value's own keys.", [
    fn("keys", "(value)", "Its keys, as an array."),
    fn("values", "(value)", "Its values, as an array."),
    fn("entries", "(value)", "Its [key, value] pairs."),
    fn("assign", "(target, source)", "Copies one onto another."),
    fn("fromEntries", "(pairs)", "Pairs back into an object.")
  ]),
  group("Array", "Making arrays.", [
    fn("isArray", "(value)", "Whether it is one."),
    fn("from", "(value)", "Anything list-shaped, as an array.")
  ]),
  group("Number", "Reading numbers out of text.", [
    fn("parseInt", "(text, 10)", "A whole number, or NaN."),
    fn("parseFloat", "(text)", "A decimal number, or NaN."),
    fn("isInteger", "(value)", "Whether it is a whole number."),
    fn("isFinite", "(value)", "Whether it is a real number.")
  ]),
  group("Date", "Times.", [fn("now", "()", "Milliseconds since 1970.")]),
  fn("parseInt", "(text, 10)", "A whole number out of text, or NaN."),
  fn("parseFloat", "(text)", "A decimal number out of text, or NaN."),
  fn("isNaN", "(value)", "Whether it failed to be a number."),
  fn("isFinite", "(value)", "Whether it is a real number."),
  fn("encodeURIComponent", "(text)", "Text made safe inside a URL."),
  fn("decodeURIComponent", "(text)", "The reverse."),
  fn("btoa", "(text)", "Text as base64 — how Basic auth is built."),
  fn("atob", "(text)", "Base64 back to text."),
  fn("String", "(value)", "Anything as text."),
  fn("Number", "(value)", "Anything as a number."),
  fn("Boolean", "(value)", "Anything as true or false.")
];

export const COMMON_MEMBERS: ApiNode[] = [
  fn("toString", "()", "This value as text."),
  fn("toFixed", "(digits)", "A number as text, to so many decimals."),
  fn("toISOString", "()", "A date as text."),
  fn("trim", "()", "Without the space around it."),
  fn("toLowerCase", "()", "In lower case."),
  fn("toUpperCase", "()", "In upper case."),
  fn("split", "(separator)", "Text cut into an array."),
  fn("slice", "(from, to)", "A piece of it."),
  fn("replace", "(find, put)", "With one part swapped."),
  fn("includes", "(value)", "Whether it contains this."),
  fn("startsWith", "(text)", "Whether it begins with this."),
  fn("endsWith", "(text)", "Whether it ends with this."),
  fn("indexOf", "(value)", "Where this first appears, or -1."),
  fn("padStart", "(width, fill)", "Filled out to a width."),
  fn("map", "(item => item)", "Each item, changed."),
  fn("filter", "(item => true)", "Only the items that match."),
  fn("find", "(item => true)", "The first item that matches."),
  fn("some", "(item => true)", "Whether any item matches."),
  fn("every", "(item => true)", "Whether all items match."),
  fn("forEach", "(item => {})", "Walk each item."),
  fn("join", "(separator)", "An array as one piece of text."),
  fn("push", "(value)", "Adds to the end."),
  fn("sort", "()", "In order."),
  fn("reverse", "()", "Back to front."),
  { name: "length", kind: "value", signature: null, detail: "How many.", phases: BOTH }
];

export function jsNamespace(name: string): ApiNode | null {
  return JS_GLOBALS.find((node) => node.name === name && node.members) ?? null;
}

export function jsGlobalNames(): string[] {
  return JS_GLOBALS.map((node) => node.name);
}
