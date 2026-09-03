export const REPORT_STYLES = `
:root {
  color-scheme: light dark;
  --ink: #14161a;
  --muted: #5b6270;
  --line: #e3e6ec;
  --surface: #ffffff;
  --ground: #f6f7f9;
  --pass: #1f7a4d;
  --fail: #b4232a;
  --warn: #8a6100;
}

@media (prefers-color-scheme: dark) {
  :root {
    --ink: #e8eaee;
    --muted: #9aa2b1;
    --line: #2a2f38;
    --surface: #171a1f;
    --ground: #0f1216;
    --pass: #5fd39a;
    --fail: #ff8a8a;
    --warn: #e0b356;
  }
}

* { box-sizing: border-box; }

body {
  margin: 0;
  padding: 40px 24px 80px;
  background: var(--ground);
  color: var(--ink);
  font: 14px/1.55 ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif;
}

main { max-width: 900px; margin: 0 auto; }

h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: -0.01em; }
h2 { font-size: 13px; margin: 32px 0 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }

.verdict { font-weight: 600; }
.verdict.passed { color: var(--pass); }
.verdict.failed, .verdict.infrastructure-error { color: var(--fail); }
.verdict.cancelled { color: var(--warn); }

.panel {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
}

.meta { display: grid; grid-template-columns: 160px 1fr; }
.meta > div { padding: 9px 14px; border-bottom: 1px solid var(--line); }
.meta > div:nth-child(odd) { color: var(--muted); }
.meta > div:nth-last-child(-n+2) { border-bottom: 0; }

.row { display: flex; gap: 12px; padding: 11px 14px; border-bottom: 1px solid var(--line); }
.row:last-child { border-bottom: 0; }
.row .index { color: var(--muted); min-width: 22px; font-variant-numeric: tabular-nums; }
.row .body { flex: 1; min-width: 0; }
.row .status { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
.row .status.passed { color: var(--pass); }
.row .status.failed { color: var(--fail); }
.row .status.skipped { color: var(--muted); }
.row .duration { color: var(--muted); font-variant-numeric: tabular-nums; }

pre {
  margin: 8px 0 0;
  padding: 10px 12px;
  background: var(--ground);
  border-radius: 6px;
  overflow-x: auto;
  font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: pre-wrap;
  word-break: break-word;
}

.source { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
.severity-error .summary { color: var(--fail); }
.severity-warning .summary { color: var(--warn); }

figure { margin: 0; padding: 14px; border-bottom: 1px solid var(--line); }
figure:last-child { border-bottom: 0; }
figure img { width: 100%; border: 1px solid var(--line); border-radius: 6px; display: block; }
figcaption { color: var(--muted); font-size: 12px; padding-top: 8px; }

.empty { padding: 14px; color: var(--muted); }
`;
