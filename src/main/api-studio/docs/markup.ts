const SAFE_LINK = /^(https?:\/\/|mailto:)/i;

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(text: string): string {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, (_match, code: string) => `<code>${code}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, (_match, bold: string) => `<strong>${bold}</strong>`)
    .replace(/(^|[^*])\*([^*\n]+)\*/g, (_match, before: string, italic: string) =>
      `${before}<em>${italic}</em>`
    )
    .replace(/_([^_\n]+)_/g, (_match, italic: string) => `<em>${italic}</em>`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label: string, href: string) =>
      SAFE_LINK.test(href) ? `<a href="${href}">${label}</a>` : match
    );
}

function listHtml(items: string[], ordered: boolean): string {
  const rows = items.map((item) => `<li>${inline(item)}</li>`).join("");

  return ordered ? `<ol>${rows}</ol>` : `<ul>${rows}</ul>`;
}

function paragraph(lines: string[]): string {
  return `<p>${lines.map((line) => inline(line)).join("<br />")}</p>`;
}

export function renderMarkup(text: string): string {
  const source = (text ?? "").replace(/\r\n/g, "\n").trim();

  if (!source) return "";

  const html: string[] = [];
  const lines = source.split("\n");
  let paragraphLines: string[] = [];
  let listItems: string[] = [];
  let ordered = false;
  let quoteLines: string[] = [];
  let codeLines: string[] | null = null;

  const flushParagraph = () => {
    if (paragraphLines.length > 0) html.push(paragraph(paragraphLines));
    paragraphLines = [];
  };
  const flushList = () => {
    if (listItems.length > 0) html.push(listHtml(listItems, ordered));
    listItems = [];
  };
  const flushQuote = () => {
    if (quoteLines.length > 0) html.push(`<blockquote>${paragraph(quoteLines)}</blockquote>`);
    quoteLines = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (codeLines) {
        html.push(`<pre class="doc-code"><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = null;
      } else {
        flushAll();
        codeLines = [];
      }
      continue;
    }

    if (codeLines) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      flushAll();
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);

    if (heading) {
      flushAll();
      html.push(`<h4 class="doc-prose-heading">${inline(heading[2])}</h4>`);
      continue;
    }

    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);

    if (bullet || numbered) {
      flushParagraph();
      flushQuote();

      const nextOrdered = Boolean(numbered);

      if (listItems.length > 0 && nextOrdered !== ordered) flushList();

      ordered = nextOrdered;
      listItems.push((bullet ?? numbered)![1]);
      continue;
    }

    const quoted = /^\s*>\s?(.*)$/.exec(line);

    if (quoted) {
      flushParagraph();
      flushList();
      quoteLines.push(quoted[1]);
      continue;
    }

    flushList();
    flushQuote();
    paragraphLines.push(line);
  }

  if (codeLines) html.push(`<pre class="doc-code"><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);

  flushAll();

  return html.join("\n");
}

export function plainText(text: string): string {
  return (text ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[*_`>#]/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
