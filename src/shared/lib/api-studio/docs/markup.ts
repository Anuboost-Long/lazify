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
		.replace(
			/(^|[^*])\*([^*\n]+)\*/g,
			(_match, before: string, italic: string) => `${before}<em>${italic}</em>`,
		)
		.replace(/_([^_\n]+)_/g, (_match, italic: string) => `<em>${italic}</em>`)
		.replace(/\[([^[\]]+)\]\(([^)\s]+)\)/g, (match, label: string, href: string) =>
			SAFE_LINK.test(href) ? `<a href="${href}">${label}</a>` : match,
		);
}

function listHtml(items: string[], ordered: boolean): string {
	const rows = items.map((item) => `<li>${inline(item)}</li>`).join("");

	return ordered ? `<ol>${rows}</ol>` : `<ul>${rows}</ul>`;
}

function paragraph(lines: string[]): string {
	return `<p>${lines.map((line) => inline(line)).join("<br />")}</p>`;
}

function codeHtml(lines: string[]): string {
	return `<pre class="doc-code"><code>${escapeHtml(lines.join("\n"))}</code></pre>`;
}

/** Blocks still being collected, each closed by the next line that ends it. */
interface Pending {
	paragraph: string[];
	list: string[];
	ordered: boolean;
	quote: string[];
}

function flushParagraph(pending: Pending, html: string[]): void {
	if (pending.paragraph.length > 0) html.push(paragraph(pending.paragraph));
	pending.paragraph = [];
}

function flushList(pending: Pending, html: string[]): void {
	if (pending.list.length > 0) html.push(listHtml(pending.list, pending.ordered));
	pending.list = [];
}

function flushQuote(pending: Pending, html: string[]): void {
	if (pending.quote.length > 0) html.push(`<blockquote>${paragraph(pending.quote)}</blockquote>`);
	pending.quote = [];
}

function flushAll(pending: Pending, html: string[]): void {
	flushParagraph(pending, html);
	flushList(pending, html);
	flushQuote(pending, html);
}

/** One line outside a code fence: a heading, a list item, a quote, or prose. */
function renderProseLine(line: string, pending: Pending, html: string[]): void {
	if (!line.trim()) {
		flushAll(pending, html);
		return;
	}

	const heading = /^(#{1,6})\s+(.*)/.exec(line);

	if (heading) {
		flushAll(pending, html);
		html.push(`<h4 class="doc-prose-heading">${inline(heading[2])}</h4>`);
		return;
	}

	const bullet = /^\s*[-*]\s+(.*)/.exec(line);
	const numbered = /^\s*\d+[.)]\s+(.*)/.exec(line);

	if (bullet || numbered) {
		flushParagraph(pending, html);
		flushQuote(pending, html);

		const nextOrdered = Boolean(numbered);

		if (pending.list.length > 0 && nextOrdered !== pending.ordered) flushList(pending, html);

		pending.ordered = nextOrdered;
		pending.list.push((bullet ?? numbered)![1]);
		return;
	}

	const quoted = /^\s*>\s?(.*)/.exec(line);

	if (quoted) {
		flushParagraph(pending, html);
		flushList(pending, html);
		pending.quote.push(quoted[1]);
		return;
	}

	flushList(pending, html);
	flushQuote(pending, html);
	pending.paragraph.push(line);
}

export function renderMarkup(text: string): string {
	const source = (text ?? "").replace(/\r\n/g, "\n").trim();

	if (!source) return "";

	const html: string[] = [];
	const lines = source.split("\n");
	const pending: Pending = { paragraph: [], list: [], ordered: false, quote: [] };
	let codeLines: string[] | null = null;

	for (const line of lines) {
		if (line.trim().startsWith("```")) {
			if (codeLines) {
				html.push(codeHtml(codeLines));
				codeLines = null;
			} else {
				flushAll(pending, html);
				codeLines = [];
			}
			continue;
		}

		if (codeLines) {
			codeLines.push(line);
			continue;
		}

		renderProseLine(line, pending, html);
	}

	if (codeLines) html.push(codeHtml(codeLines));

	flushAll(pending, html);

	return html.join("\n");
}

export function plainText(text: string): string {
	return (text ?? "")
		.replace(/```[\s\S]*?```/g, " ")
		.replace(/[*_`>#]/g, "")
		.replace(/\[([^[\]]+)\]\([^)]*\)/g, "$1")
		.replace(/\s+/g, " ")
		.trim();
}
