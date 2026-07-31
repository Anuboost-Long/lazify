import { Fragment, useMemo, type CSSProperties } from "react";

import { PLAIN_LANGUAGE } from "./highlighter/languages";
import { useHighlightedDocument, useHighlightedLine } from "./highlighter/use-highlighter";
import type { HighlightLine, HighlightToken } from "./highlighter/types";
import { type Token, type TokenType, tokenizeLine, tokenizeLines } from "./tokenize";

/**
 * Two paint paths feed one output.
 *
 * The engine path colours from the active TextMate theme, so tokens carry
 * resolved hex colours. The fallback path colours from the CSS variables in
 * styles.css, which follow the app's light/dark theme. Callers never choose —
 * the engine is used the moment it can answer.
 */

/** Fallback token colours live in styles.css so they follow the app theme. */
const COLOR: Record<TokenType, string> = {
  plain: "var(--code-plain)",
  comment: "var(--code-comment)",
  string: "var(--code-string)",
  number: "var(--code-number)",
  keyword: "var(--code-keyword)",
  type: "var(--code-type)",
  function: "var(--code-function)",
  property: "var(--code-property)",
  punctuation: "var(--code-punctuation)",
  tag: "var(--code-tag)",
  attribute: "var(--code-attribute)"
};

/** TextMate packs font style into bit flags. */
const ITALIC = 1;
const BOLD = 2;
const UNDERLINE = 4;
const STRIKETHROUGH = 8;

function styleOf(token: HighlightToken): CSSProperties {
  const style: CSSProperties = { color: token.color };
  const fontStyle = token.fontStyle ?? 0;

  if (fontStyle <= 0) return style;

  if (fontStyle & ITALIC) style.fontStyle = "italic";
  if (fontStyle & BOLD) style.fontWeight = "bold";

  const lines = [
    fontStyle & UNDERLINE ? "underline" : "",
    fontStyle & STRIKETHROUGH ? "line-through" : ""
  ]
    .filter(Boolean)
    .join(" ");

  if (lines) style.textDecoration = lines;

  return style;
}

function renderThemed(line: HighlightLine, keyPrefix: string) {
  return line.map((token, index) => (
    <span key={`${keyPrefix}-${index}`} style={styleOf(token)}>
      {token.content}
    </span>
  ));
}

function renderFallback(tokens: Token[], keyPrefix: string) {
  return tokens.map((token, index) => (
    <span key={`${keyPrefix}-${index}`} style={{ color: COLOR[token.type] }}>
      {token.text}
    </span>
  ));
}

/** One highlighted line, for rows that arrive without the rest of their file. */
export function CodeLineText({
  text,
  language
}: Readonly<{ text: string; language: string }>) {
  const themed = useHighlightedLine(text, language);

  const fallback = useMemo(
    () => (themed || language === PLAIN_LANGUAGE ? null : tokenizeLine(text, language)),
    [themed, text, language]
  );

  if (language === PLAIN_LANGUAGE) return <>{text || " "}</>;

  if (themed) return <>{themed.length === 0 ? " " : renderThemed(themed, "t")}</>;

  return <>{!fallback || fallback.length === 0 ? " " : renderFallback(fallback, "t")}</>;
}

/**
 * A whole document, highlighted with multi-line strings and comments carried
 * across line breaks. Lines are returned as an array so callers can pair them
 * with their own gutter.
 */
export function useHighlightedLines(code: string, language: string) {
  const themed = useHighlightedDocument(code, language);

  return useMemo(() => {
    if (language === PLAIN_LANGUAGE) {
      return code.split("\n").map((line, index) => (
        <Fragment key={index}>{line || " "}</Fragment>
      ));
    }

    if (themed) {
      return themed.map((line, index) => (
        <Fragment key={index}>
          {line.length === 0 ? " " : renderThemed(line, `l${index}`)}
        </Fragment>
      ));
    }

    return tokenizeLines(code, language).map((tokens, index) => (
      <Fragment key={index}>
        {tokens.length === 0 ? " " : renderFallback(tokens, `l${index}`)}
      </Fragment>
    ));
  }, [code, language, themed]);
}
