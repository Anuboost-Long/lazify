/**
 * The fallback syntax highlighter.
 *
 * Real highlighting is done by the TextMate engine in `./highlighter`, which
 * needs a moment to boot (WASM plus a grammar fetch). This scanner is
 * synchronous and instant, so panes paint approximate colours on the first
 * frame and the engine takes over on the next. It also covers the case where a
 * grammar fails to load at all.
 *
 * Languages are keyed by grammar id, matching what `languageIdOf` returns.
 */

import { languageIdOf, PLAIN_LANGUAGE } from "./highlighter/languages";

export type TokenType =
  | "plain"
  | "comment"
  | "string"
  | "number"
  | "keyword"
  | "type"
  | "function"
  | "property"
  | "punctuation"
  | "tag"
  | "attribute";

export interface Token {
  text: string;
  type: TokenType;
}

interface LanguageSpec {
  keywords: Set<string>;
  /** Words that read as types rather than control flow. */
  types: Set<string>;
  lineComment: string[];
  blockComment: [string, string] | null;
  quotes: string[];
  /** `${…}` inside backticks, and identifiers that may be tag names. */
  templates: boolean;
  markup: boolean;
}

const JS_KEYWORDS =
  "as async await break case catch class const continue debugger default delete do else enum export extends finally for from function get if implements import in instanceof interface let new of package private protected public return satisfies set static super switch this throw try typeof var void while with yield declare namespace module abstract readonly keyof infer is asserts override";
const JS_TYPES =
  "any bigint boolean never null number object string symbol undefined unknown true false void Array Promise Record Partial Readonly Pick Omit Map Set Date RegExp Error JSON Math console window document globalThis";

const CS_KEYWORDS =
  "abstract as async await base break case catch checked class const continue default delegate do else enum event explicit extern finally fixed for foreach get goto if implicit in init interface internal is lock namespace new operator out override params partial private protected public readonly record ref required return sealed set sizeof stackalloc static struct switch this throw try typeof unchecked unsafe using virtual volatile when where while yield add remove global nameof with";
const CS_TYPES =
  "bool byte char decimal double dynamic float int long nint nuint object sbyte short string uint ulong ushort var void true false null value Task ValueTask List Dictionary IEnumerable IQueryable Nullable Span Guid DateTime DateTimeOffset TimeSpan Exception Console String Math Convert Enumerable HttpClient IActionResult ActionResult";

const FS_KEYWORDS =
  "let mutable rec and or not use using module namespace open type of val member abstract override interface inherit static new do done downto elif else if then for while to in yield return match with when function fun try finally exception raise failwith begin end struct class internal private public global lazy assert upcast downcast inline mutable";

const VB_KEYWORDS =
  "AddHandler AndAlso As ByRef ByVal Case Catch Class Const Continue Dim Do Each Else ElseIf End EndIf Enum Event Exit False Finally For Friend Function Get Global GoTo Handles If Implements Imports In Inherits Interface Is Let Loop Me Module MustInherit MustOverride My Namespace New Next Not Nothing NotInheritable Object On Operator Option Optional Or OrElse Overloads Overridable Overrides ParamArray Partial Private Property Protected Public RaiseEvent ReadOnly Return Select Set Shadows Shared Static Step Stop Structure Sub Then Throw To True Try TypeOf Until Using When While With WithEvents WriteOnly Xor";

// Contextual keywords (`get`, `final`, `some`) are listed flat alongside the
// reserved ones, the way the C# set lists `get`/`set` — the scanner has no
// context to tell them apart, and colouring them is right far more often
// than not.
const SWIFT_KEYWORDS =
  "actor any as associatedtype async await borrowing break case catch class consuming continue convenience default defer deinit didSet distributed do dynamic each else enum extension fallthrough fileprivate final for func get guard if import in indirect infix init inout internal is isolated lazy let macro mutating nonisolated nonmutating open operator optional override package postfix precedencegroup prefix private protocol public repeat required rethrows return self Self set some static struct subscript super switch throw throws try typealias unowned var weak where while willSet";
// Uppercase words already colour as types, so this only has to carry the
// lowercase literals — the named types are here to document the intent.
const SWIFT_TYPES =
  "nil true false Int Int8 Int16 Int32 Int64 UInt UInt8 UInt16 UInt32 UInt64 Double Float CGFloat Bool String Character Substring Array Dictionary Set Optional Result Data Date URL UUID Any AnyObject Void Never Error Task Codable Equatable Hashable Identifiable Sendable View Text Image Color State Binding Published ObservableObject";

const PY_KEYWORDS =
  "and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case";

const CSS_KEYWORDS =
  "important media import supports keyframes from to charset font-face namespace use include mixin extend if else return";

const SHELL_KEYWORDS =
  "if then else elif fi for while do done case esac function return export local readonly source alias set unset echo cd exit";

function spec(partial: Partial<LanguageSpec>): LanguageSpec {
  return {
    keywords: new Set(),
    types: new Set(),
    lineComment: [],
    blockComment: null,
    quotes: ['"', "'"],
    templates: false,
    markup: false,
    ...partial
  };
}

const LANGUAGES: Record<string, LanguageSpec> = {
  javascript: spec({
    keywords: new Set(JS_KEYWORDS.split(" ")),
    types: new Set(JS_TYPES.split(" ")),
    lineComment: ["//"],
    blockComment: ["/*", "*/"],
    quotes: ['"', "'", "`"],
    templates: true
  }),
  csharp: spec({
    keywords: new Set(CS_KEYWORDS.split(" ")),
    types: new Set(CS_TYPES.split(" ")),
    lineComment: ["///", "//"],
    blockComment: ["/*", "*/"],
    // `$"…"` and `@"…"` open on the quote, so the prefix falls out as plain.
    quotes: ['"', "'"]
  }),
  fsharp: spec({
    keywords: new Set(FS_KEYWORDS.split(" ")),
    types: new Set(CS_TYPES.split(" ")),
    lineComment: ["//"],
    blockComment: ["(*", "*)"]
  }),
  vb: spec({
    keywords: new Set(VB_KEYWORDS.split(" ")),
    types: new Set(CS_TYPES.split(" ")),
    lineComment: ["'", "REM "],
    quotes: ['"']
  }),
  swift: spec({
    keywords: new Set(SWIFT_KEYWORDS.split(" ")),
    types: new Set(SWIFT_TYPES.split(" ")),
    lineComment: ["///", "//"],
    blockComment: ["/*", "*/"],
    // Swift has no single-quoted string, so treating `'` as one would swallow
    // the rest of any line holding an apostrophe.
    quotes: ['"']
  }),
  json: spec({
    keywords: new Set(["true", "false", "null"]),
    quotes: ['"']
  }),
  css: spec({
    keywords: new Set(CSS_KEYWORDS.split(" ")),
    blockComment: ["/*", "*/"],
    lineComment: ["//"]
  }),
  html: spec({
    blockComment: ["<!--", "-->"],
    markup: true
  }),
  python: spec({
    keywords: new Set(PY_KEYWORDS.split(" ")),
    types: new Set(["True", "False", "None", "self", "int", "str", "float", "bool", "list", "dict"]),
    lineComment: ["#"]
  }),
  shell: spec({
    keywords: new Set(SHELL_KEYWORDS.split(" ")),
    lineComment: ["#"]
  }),
  yaml: spec({
    keywords: new Set(["true", "false", "null", "yes", "no", "on", "off"]),
    lineComment: ["#"]
  }),
  markdown: spec({ lineComment: [], markup: false }),
  plain: spec({})
};

/**
 * Grammar ids the engine knows about, mapped onto the nearest spec we have.
 * Anything absent falls through to `plain`, which is the right answer for a
 * language this scanner was never going to approximate well.
 */
const FALLBACK_ALIASES: Record<string, keyof typeof LANGUAGES> = {
  typescript: "javascript",
  tsx: "javascript",
  jsx: "javascript",
  vue: "html",
  svelte: "html",
  astro: "html",
  xml: "html",
  jsonc: "json",
  json5: "json",
  scss: "css",
  sass: "css",
  less: "css",
  stylus: "css",
  shellscript: "shell",
  bash: "shell",
  fish: "shell",
  zsh: "shell",
  dotenv: "shell",
  toml: "yaml",
  ini: "yaml",
  mdx: "markdown",
  // Razor is C# embedded in markup; the markup half reads better as HTML.
  razor: "html",
  // Close enough to read at a glance until the real grammar lands.
  java: "javascript",
  kotlin: "javascript",
  go: "javascript",
  rust: "javascript",
  c: "javascript",
  cpp: "javascript",
  // The other half of an iOS project: bridging headers and legacy app
  // delegates sit next to the Swift, so they get the same C-like treatment.
  "objective-c": "javascript",
  "objective-cpp": "javascript",
  php: "javascript",
  dart: "javascript",
  scala: "javascript",
  ruby: "python",
  elixir: "python",
  lua: "python",
  r: "python",
  julia: "python",
  perl: "python"
};

/** Maps a file name to the rules used to colour it. */
export function languageOf(fileName: string | null | undefined): string {
  return languageIdOf(fileName);
}

function specFor(language: string): LanguageSpec {
  if (language === PLAIN_LANGUAGE) return LANGUAGES.plain;

  return LANGUAGES[FALLBACK_ALIASES[language] ?? language] ?? LANGUAGES.plain;
}

const IDENTIFIER_START = /[A-Za-z_$]/;
const IDENTIFIER_PART = /[A-Za-z0-9_$]/;
const DIGIT = /[0-9]/;
const PUNCTUATION = /[{}[\]()<>;,.:?!+\-*/%=&|^~@#]/;

/**
 * Scans source into per-line tokens. Multi-line strings and comments are
 * carried across lines, so a document highlights the same way an editor does.
 */
export function tokenizeLines(code: string, language: string): Token[][] {
  const rules = specFor(language);
  const lines: Token[][] = [];

  let current: Token[] = [];
  let index = 0;

  const push = (text: string, type: TokenType) => {
    if (!text) return;

    // A token can straddle a newline (block comments, template strings), so
    // split it back onto the lines it covers.
    const parts = text.split("\n");

    parts.forEach((part, position) => {
      if (position > 0) {
        lines.push(current);
        current = [];
      }

      if (part) current.push({ text: part, type });
    });
  };

  const startsWith = (value: string) => code.startsWith(value, index);

  while (index < code.length) {
    const char = code[index];

    if (char === "\n") {
      lines.push(current);
      current = [];
      index += 1;
      continue;
    }

    // Line comment
    const lineToken = rules.lineComment.find(startsWith);
    if (lineToken) {
      const end = code.indexOf("\n", index);
      const stop = end === -1 ? code.length : end;
      push(code.slice(index, stop), "comment");
      index = stop;
      continue;
    }

    // Block comment
    if (rules.blockComment && startsWith(rules.blockComment[0])) {
      const [open, close] = rules.blockComment;
      const end = code.indexOf(close, index + open.length);
      const stop = end === -1 ? code.length : end + close.length;
      push(code.slice(index, stop), "comment");
      index = stop;
      continue;
    }

    // String
    if (rules.quotes.includes(char)) {
      let cursor = index + 1;

      while (cursor < code.length) {
        if (code[cursor] === "\\") {
          cursor += 2;
          continue;
        }
        if (code[cursor] === char) {
          cursor += 1;
          break;
        }
        // Only backticks may span lines; a broken quote ends at the newline.
        if (code[cursor] === "\n" && char !== "`") break;
        cursor += 1;
      }

      push(code.slice(index, cursor), "string");
      index = cursor;
      continue;
    }

    // Markup tag
    if (rules.markup && char === "<") {
      let cursor = index + 1;
      while (cursor < code.length && code[cursor] !== ">") cursor += 1;
      push(code.slice(index, Math.min(cursor + 1, code.length)), "tag");
      index = cursor + 1;
      continue;
    }

    // Number
    if (DIGIT.test(char)) {
      let cursor = index;
      while (cursor < code.length && /[0-9a-fA-FxXoObB._]/.test(code[cursor])) cursor += 1;
      push(code.slice(index, cursor), "number");
      index = cursor;
      continue;
    }

    // Identifier
    if (IDENTIFIER_START.test(char)) {
      let cursor = index;
      while (cursor < code.length && IDENTIFIER_PART.test(code[cursor])) cursor += 1;

      const word = code.slice(index, cursor);
      let type: TokenType = "plain";

      if (rules.keywords.has(word)) {
        type = "keyword";
      } else if (rules.types.has(word)) {
        type = "type";
      } else if (code[cursor] === "(") {
        type = "function";
      } else if (/^[A-Z]/.test(word)) {
        type = "type";
      } else if (code[cursor] === ":") {
        type = "property";
      }

      push(word, type);
      index = cursor;
      continue;
    }

    if (PUNCTUATION.test(char)) {
      push(char, "punctuation");
      index += 1;
      continue;
    }

    push(char, "plain");
    index += 1;
  }

  lines.push(current);

  return lines;
}

/** Colours one line on its own, for rows that arrive without their file. */
export function tokenizeLine(line: string, language: string): Token[] {
  return tokenizeLines(line, language)[0] ?? [];
}
