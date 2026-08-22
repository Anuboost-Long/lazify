import type { DocMargin, DocTheme } from "../types";

export const PAGE_MARGINS: Record<DocMargin, number> = { narrow: 12, normal: 18, wide: 26 };

export function marginInches(margin: DocMargin): number {
  return Number((PAGE_MARGINS[margin] / 25.4).toFixed(3));
}

export function documentStyles(theme: DocTheme): string {
  const codeBackground = theme.darkCode ? "#0f172a" : "#f5f7fa";
  const codeText = theme.darkCode ? "#e2e8f0" : "#1f2933";
  const codeBorder = theme.darkCode ? "#1e293b" : "#e3e8ef";

  return `
:root {
  --font-ui: "Google Sans", "Avenir Next", "Segoe UI", sans-serif;
  --accent: ${theme.accent};
  --ink: #16202b;
  --muted: #5b6b7c;
  --line: #e2e8f0;
  --soft: #f7f9fc;
  --code-bg: ${codeBackground};
  --code-ink: ${codeText};
  --code-line: ${codeBorder};
}
:root:lang(en) { --font-ui: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
* { box-sizing: border-box; }
body {
  margin: 0;
  background: #ffffff;
  color: var(--ink);
  font: 15px/1.65 var(--font-ui);
  -webkit-font-smoothing: antialiased;
}
code, pre, .mono { font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace; }
a { color: var(--accent); text-decoration: none; }
h1, h2, h3, h4 { line-height: 1.25; margin: 0; font-weight: 650; letter-spacing: -0.01em; }
p { margin: 0 0 0.85em; }
ul, ol { margin: 0 0 0.85em; padding-left: 1.25em; }
li { margin: 0.2em 0; }
blockquote { margin: 0 0 0.85em; padding: 0.1em 0 0.1em 0.9em; border-left: 2px solid var(--line); color: var(--muted); }
.layout { display: flex; align-items: flex-start; gap: 40px; max-width: 68rem; margin: 0 auto; padding: 40px 32px 96px; }
.contents { position: sticky; top: 32px; width: 15rem; flex: 0 0 15rem; font-size: 12.5px; }
.contents h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.09em; color: var(--muted); margin-bottom: 10px; }
.contents ol { list-style: none; margin: 0; padding: 0; }
.contents .group { margin-top: 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
.contents a { display: block; padding: 3px 0; color: var(--ink); }
.contents a:hover { color: var(--accent); }
.doc { min-width: 0; flex: 1; }
.cover { min-height: 88vh; max-width: 68rem; margin: 0 auto; padding: 0 32px; display: flex; flex-direction: column; justify-content: center; page-break-after: always; }
.logo { display: block; max-width: 220px; max-height: 72px; margin-bottom: 22px; object-fit: contain; }
.cover .eyebrow { font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); font-weight: 600; }
.cover h1 { font-size: 44px; margin: 14px 0 10px; }
.cover .subtitle { font-size: 17px; color: var(--muted); max-width: 34rem; }
.cover .meta { margin-top: 34px; border-top: 1px solid var(--line); padding-top: 18px; display: flex; flex-wrap: wrap; gap: 28px; font-size: 13px; }
.cover .meta dt { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin-bottom: 3px; }
.cover .meta dd { margin: 0; }
.section { margin-bottom: 40px; }
.section > h2 { font-size: 22px; padding-bottom: 8px; border-bottom: 1px solid var(--line); margin-bottom: 16px; }
.section.routes > h2 { font-size: 28px; padding-bottom: 0; border-bottom: 0; margin-bottom: 12px; }
.folder-note { margin-bottom: 26px; color: var(--ink); max-width: 44rem; }
.group-title { margin: 44px 0 18px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); }
.route { padding: 26px 0 10px; border-top: 1px solid var(--line); }
.route-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.route-head h3 { font-size: 19px; }
.verb { font-size: 14px; font-weight: 700; letter-spacing: 0.03em; }
.verb.GET { color: #15803d; } .verb.POST { color: #b45309; } .verb.PUT { color: #1d4ed8; }
.verb.PATCH { color: #7e22ce; } .verb.DELETE { color: #b91c1c; }
.verb.HEAD { color: #0f766e; } .verb.OPTIONS { color: #475569; }
.path-bar {
  position: relative; margin: 12px 0 4px; padding: 10px 44px 10px 14px;
  border: 1px solid var(--line); border-radius: 8px; background: var(--soft);
}
.path-bar .path { font-size: 13.5px; color: var(--ink); word-break: break-all; }
.path-bar .copy { opacity: 1; top: 50%; transform: translateY(-50%); background: transparent; border-color: transparent; }
.path-bar .copy:hover { color: var(--ink); border-color: var(--line); }
.field { margin-top: 16px; }
.field h4 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin-bottom: 6px; }
.doc-prose-heading { font-size: 14px; margin: 12px 0 6px; }
table { width: 100%; border-collapse: collapse; margin: 8px 0 4px; font-size: 13.5px; }
th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--muted); font-weight: 600; padding: 6px 10px 6px 0; border-bottom: 1px solid var(--line); }
td { padding: 7px 10px 7px 0; border-bottom: 1px solid var(--line); vertical-align: top; }
td.name { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12.5px; white-space: nowrap; }
.tag { display: inline-block; padding: 1px 6px; border-radius: 4px; background: var(--soft); border: 1px solid var(--line); font-size: 11px; color: var(--muted); }
.tag.required { border-color: color-mix(in srgb, var(--accent) 40%, var(--line)); color: var(--accent); }
pre.doc-code { background: var(--code-bg); color: var(--code-ink); border: 1px solid var(--code-line); border-radius: 8px; padding: 12px 14px; overflow-x: auto; font-size: 12.5px; line-height: 1.55; white-space: pre-wrap; word-break: break-word; }
.code-block { position: relative; }
.copy {
  position: absolute; top: 8px; right: 8px; opacity: 0;
  display: flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; padding: 0;
  border: 1px solid var(--code-line); border-radius: 6px;
  background: ${theme.darkCode ? "rgba(255,255,255,0.06)" : "#ffffff"}; color: var(--muted);
  cursor: pointer; transition: opacity 120ms ease, color 120ms ease, border-color 120ms ease;
}
.copy svg { width: 14px; height: 14px; }
.code-block:hover .copy, .copy:focus-visible { opacity: 1; }
.code-block .copy:hover {
  color: ${theme.darkCode ? "#ffffff" : "var(--ink)"};
  border-color: ${theme.darkCode ? "rgba(255,255,255,0.32)" : "var(--muted)"};
}
pre.doc-code code { display: block; background: none; border: 0; border-radius: 0; padding: 0; color: inherit; font-size: inherit; }
code { background: var(--soft); border: 1px solid var(--line); border-radius: 4px; padding: 0 4px; font-size: 0.9em; }
.status { font-weight: 650; }
.status.ok { color: #2f855a; } .status.warn { color: #b7791f; } .status.bad { color: #c53030; }
.empty { color: var(--muted); font-size: 13px; font-style: italic; }
.footnote { margin-top: 56px; padding-top: 14px; border-top: 1px solid var(--line); font-size: 11.5px; color: var(--muted); display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.credit { display: inline-flex; align-items: center; gap: 7px; font-weight: 600; color: var(--ink); }
.credit .mark { width: 16px; height: 16px; flex: 0 0 16px; border-radius: 4px; }
@page { size: ${theme.pageSize === "Letter" ? "letter" : "A4"}; margin: ${PAGE_MARGINS[theme.margin]}mm; }
@media print {
  .copy { display: none; }
  .layout { display: block; max-width: none; padding: 0; }
  .contents { position: static; width: auto; flex: none; font-size: 11pt; page-break-after: always; margin-bottom: 0; }
  .contents a { padding: 4px 0; }
  body { font-size: 11pt; }
  .cover { min-height: auto; max-width: none; padding: 22vh 0 0; }
  a { color: var(--ink); }
  h2, h3, h4, .group-title, .doc-prose-heading { page-break-after: avoid; }
  .route-head { page-break-after: avoid; }
  .path-bar { page-break-inside: avoid; page-break-before: avoid; }
  p, li, pre.doc-code { orphans: 3; widows: 3; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  .footnote { margin-top: 32px; page-break-before: avoid; }
}
`.trim();
}
