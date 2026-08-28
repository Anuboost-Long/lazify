import { renderMarkup } from "@main/api-studio/docs/markup";

const BLOCK_TAGS = new Set([
	"P",
	"DIV",
	"UL",
	"OL",
	"PRE",
	"BLOCKQUOTE",
	"H1",
	"H2",
	"H3",
	"H4",
	"H5",
	"H6",
]);

export function markdownToHtml(markdown: string): string {
	return renderMarkup(markdown) || "<p><br /></p>";
}

function inlineOf(node: Node): string {
	if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? "").replace(/\u00a0/g, " ");

	if (!(node instanceof HTMLElement)) return "";

	const inner = Array.from(node.childNodes).map(inlineOf).join("");

	switch (node.tagName) {
		case "BR":
			return "\n";
		case "STRONG":
		case "B":
			return inner.trim() ? `**${inner}**` : inner;
		case "EM":
		case "I":
			return inner.trim() ? `*${inner}*` : inner;
		case "CODE":
			return inner.trim() ? `\`${inner}\`` : inner;
		case "A": {
			const href = node.getAttribute("href") ?? "";

			return href ? `[${inner}](${href})` : inner;
		}
		default:
			return inner;
	}
}

function listOf(element: HTMLElement): string {
	const ordered = element.tagName === "OL";

	return Array.from(element.children)
		.filter((child) => child.tagName === "LI")
		.map((item, index) => {
			const marker = ordered ? `${index + 1}.` : "-";

			return `${marker} ${inlineOf(item).trim()}`;
		})
		.join("\n");
}

function blockOf(node: Node): string {
	if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? "").trim();

	if (!(node instanceof HTMLElement)) return "";

	switch (node.tagName) {
		case "UL":
		case "OL":
			return listOf(node);
		case "PRE":
			return `\`\`\`\n${node.textContent ?? ""}\n\`\`\``;
		case "BLOCKQUOTE":
			return inlineOf(node)
				.split("\n")
				.map((line) => `> ${line}`.trimEnd())
				.join("\n");
		case "H1":
		case "H2":
		case "H3":
		case "H4":
		case "H5":
		case "H6":
			return `### ${inlineOf(node).trim()}`;
		default:
			return inlineOf(node).trim();
	}
}

export function htmlToMarkdown(root: HTMLElement): string {
	const blocks: string[] = [];
	let loose: string[] = [];

	const flushLoose = () => {
		const line = loose.join("").trim();

		if (line) blocks.push(line);

		loose = [];
	};

	for (const child of Array.from(root.childNodes)) {
		if (child instanceof HTMLElement && BLOCK_TAGS.has(child.tagName)) {
			flushLoose();

			const block = blockOf(child);

			if (block) blocks.push(block);
			continue;
		}

		if (child instanceof HTMLElement && child.tagName === "BR") {
			flushLoose();
			continue;
		}

		loose.push(inlineOf(child));
	}

	flushLoose();

	return blocks
		.join("\n\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}
