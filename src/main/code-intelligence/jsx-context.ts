/**
 * What a name means where it is written, read from the source around it.
 *
 * A prop is the case that forces this. `onPress` on a `<Pressable>` is not a
 * project-wide name to go hunting for — it belongs to that component's props,
 * and the only honest answer is the one found by way of the component. So
 * before anything is searched for, the click is placed: is it an attribute, and
 * if so on which element, and where did that element come from.
 *
 * This reads text, not an AST. A parser would be more correct and a great deal
 * more machinery for what is, in the end, a click in a read-only viewer.
 */

export interface JsxAttribute {
  /** The element the attribute is written on: `Pressable`. */
  component: string;
  /** The attribute itself: `onPress`. */
  prop: string;
}

const IDENTIFIER_CHAR = /[A-Za-z0-9_$]/;
/** Tag names may be namespaced or dotted: `Animated.View`, `Svg.Path`. */
const TAG_NAME = /^<\s*([A-Za-z_$][\w$.]*)/;

/** The absolute offset of a 1-based line and 0-based column. */
export function offsetAt(source: string, line: number, column: number): number | null {
  const lines = source.split("\n");
  if (line < 1 || line > lines.length) return null;

  let offset = 0;
  for (let index = 0; index < line - 1; index += 1) offset += lines[index].length + 1;

  return offset + Math.min(column, lines[line - 1].length);
}

/** The word around an offset, so the caller and this agree on what was clicked. */
function wordAt(source: string, offset: number): { text: string; start: number; end: number } {
  let start = offset;
  let end = offset;

  while (start > 0 && IDENTIFIER_CHAR.test(source[start - 1])) start -= 1;
  while (end < source.length && IDENTIFIER_CHAR.test(source[end])) end += 1;

  return { text: source.slice(start, end), start, end };
}

/**
 * Where the opening tag containing `offset` begins, or null when the offset is
 * not in attribute space at all.
 *
 * Walked backwards, because attributes sit after the tag name and a tag can run
 * over many lines. Braces are skipped as a unit: `style={{ a > b }}` and
 * `onPress={() => close()}` both hold characters that would otherwise read as
 * the end of a tag. An unmatched `{` means the offset is inside an expression
 * container — a value, not an attribute name.
 */
function openingTagStart(source: string, offset: number): number | null {
  let depth = 0;

  for (let index = offset; index >= 0; index -= 1) {
    const char = source[index];

    if (char === "}") {
      depth += 1;
      continue;
    }

    if (char === "{") {
      if (depth === 0) return null;
      depth -= 1;
      continue;
    }

    if (depth > 0) continue;

    if (char === ">") {
      // An arrow, not a tag end.
      if (source[index - 1] === "=") {
        index -= 1;
        continue;
      }

      return null;
    }

    if (char === "<") return index;
  }

  return null;
}

/**
 * The attribute at a position, and the component it is written on. Null when
 * the position is a tag name, a value, or anything outside a JSX opening tag.
 */
export function attributeAt(source: string, line: number, column: number): JsxAttribute | null {
  const offset = offsetAt(source, line, column);
  if (offset === null) return null;

  const word = wordAt(source, offset);
  if (!word.text) return null;

  const tagStart = openingTagStart(source, word.start - 1);
  if (tagStart === null) return null;

  const tag = TAG_NAME.exec(source.slice(tagStart, word.start));
  if (!tag) return null;

  // An attribute stands on its own: whitespace before it, and `=` or the end of
  // the attribute after it. That is what keeps a quoted value — the "button" in
  // `accessibilityRole="button"` — from reading as one.
  if (!/\s/.test(source[word.start - 1] ?? "")) return null;

  const after = source.slice(word.end).match(/^\s*(.)/)?.[1] ?? "";
  if (after && !"=/>".includes(after) && !/\s/.test(after)) return null;

  return { component: tag[1], prop: word.text };
}

/** The module a name was imported from in this file, or null if it was not. */
export function importSpecifierOf(source: string, name: string): string | null {
  const imports = source.matchAll(/import\s+([\s\S]*?)\s*from\s*["']([^"']+)["']/g);
  const word = new RegExp(`(^|[\\s,{}*]|as\\s+)${name.replace(/[$]/g, "\\$&")}($|[\\s,{}])`);

  for (const entry of imports) {
    if (word.test(entry[1])) return entry[2];
  }

  return null;
}

/** Where a file re-exports a name from, for the barrels components hide behind. */
export function reExportSpecifierOf(source: string, name: string): string | null {
  const exports = source.matchAll(/export\s+([\s\S]*?)\s*from\s*["']([^"']+)["']/g);
  const word = new RegExp(`(^|[\\s,{}*])${name.replace(/[$]/g, "\\$&")}($|[\\s,{}])`);

  for (const entry of exports) {
    if (entry[1].includes("*") || word.test(entry[1])) return entry[2];
  }

  return null;
}
