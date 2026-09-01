import { escapeHtml, plainText, renderMarkup } from "../markup";
import { COLLECTION_SECTIONS } from "../sections";
import type { CollectionDoc } from "../types";
import { LAZIFY_MARK } from "./mark";
import { PAGE_SCRIPT } from "./page-script";
import { routeSectionHtml, type RouteView } from "./route-section";
import { documentStyles } from "./theme";

export type DocRouteInput = Omit<RouteView, "anchor">;

export interface DocumentInput {
	doc: CollectionDoc;
	routes: DocRouteInput[];
	generatedAt: string;
}

interface RouteGroup {
	id: string;
	name: string;
	description: string;
	anchor: string;
	views: RouteView[];
}

function anchorFor(text: string, index: number): string {
	const slug = text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");

	return `${slug || "item"}-${index}`;
}

function grouped(doc: CollectionDoc, routes: DocRouteInput[]): RouteGroup[] {
	const groups: RouteGroup[] = [];
	const described = new Map(doc.folders.map((folder) => [folder.id, folder]));

	routes.forEach((route, index) => {
		const id = route.entry.folderId;
		const view: RouteView = {
			...route,
			anchor: anchorFor(`${route.request.route.method}-${route.request.route.path}`, index),
		};
		const held = groups.find((group) => group.id === id);

		if (held) {
			held.views.push(view);
			return;
		}

		const folder = described.get(id);
		const name = folder?.name ?? route.entry.folder;

		groups.push({
			id,
			name,
			description: folder?.description ?? "",
			anchor: anchorFor(name || "routes", groups.length),
			views: [view],
		});
	});

	return groups;
}

function baseUrlOf(input: DocumentInput): string {
	const detected = input.routes.flatMap((route) => route.request.route.servers ?? [])[0] ?? "";

	return input.doc.baseUrl || detected || "https://api.example.com";
}

function writtenSections(doc: CollectionDoc) {
	return COLLECTION_SECTIONS.filter((section) => doc.sections[section.id]?.trim());
}

function coverHtml(input: DocumentInput, baseUrl: string): string {
	const { doc } = input;
	const entries: Array<[string, string]> = [
		["Base URL", baseUrl],
		["Version", doc.version],
		["Generated", input.generatedAt],
	];

	return `<header class="cover">
    ${doc.theme.logo ? `<img class="logo" src="${doc.theme.logo}" alt="" />` : ""}
    <span class="eyebrow">API documentation</span>
    <h1>${escapeHtml(doc.title)}</h1>
    ${doc.subtitle ? `<p class="subtitle">${escapeHtml(doc.subtitle)}</p>` : ""}
    <dl class="meta">${entries
					.filter(([, value]) => value)
					.map(
						([label, value]) =>
							`<div><dt>${escapeHtml(label)}</dt><dd class="mono">${escapeHtml(value)}</dd></div>`,
					)
					.join("")}</dl>
  </header>`;
}

function contentsGroupHtml(group: RouteGroup): string {
	const heading = group.name ? `<li class="group">${escapeHtml(group.name)}</li>` : "";
	const entries = group.views
		.map((view) => {
			const label = escapeHtml(view.entry.title || view.request.route.path);

			return `<li><a href="#${view.anchor}">${label}</a></li>`;
		})
		.join("");

	return `${heading}${entries}`;
}

function contentsHtml(doc: CollectionDoc, groups: RouteGroup[]): string {
	const sections = writtenSections(doc)
		.map((section) => `<li><a href="#${section.id}">${escapeHtml(section.title)}</a></li>`)
		.join("");
	const routes = groups.map((group) => contentsGroupHtml(group)).join("");

	return `<nav class="contents"><h2>Contents</h2><ol>${sections}${routes}</ol></nav>`;
}

function sectionsHtml(doc: CollectionDoc): string {
	return writtenSections(doc)
		.map(
			(section) => `<section class="section" id="${section.id}">
      <h2>${escapeHtml(section.title)}</h2>
      ${renderMarkup(doc.sections[section.id])}
    </section>`,
		)
		.join("");
}

function routesHtml(input: DocumentInput, groups: RouteGroup[], baseUrl: string): string {
	return groups
		.map(
			(group) => `<section class="section routes" id="${group.anchor}">
      <h2>${escapeHtml(group.name || "Routes")}</h2>
      ${group.description ? `<div class="folder-note">${renderMarkup(group.description)}</div>` : ""}
      ${group.views.map((view) => routeSectionHtml(view, input.doc.theme, baseUrl)).join("")}
    </section>`,
		)
		.join("");
}

/** The title block a document without a cover page carries instead. */
function mastheadHtml(doc: CollectionDoc): string {
	if (doc.theme.cover) return "";

	const logo = doc.theme.logo ? `<img class="logo" src="${doc.theme.logo}" alt="" />` : "";

	return `${logo}<h1>${escapeHtml(doc.title)}</h1>`;
}

export function buildDocumentHtml(input: DocumentInput): string {
	const { doc } = input;
	const baseUrl = baseUrlOf(input);
	const groups = grouped(doc, input.routes);
	const summary = plainText(doc.sections.overview ?? "").slice(0, 200);

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(doc.title)}</title>
${summary ? `<meta name="description" content="${escapeHtml(summary)}" />` : ""}
<style>${documentStyles(doc.theme)}</style>
</head>
<body>
${doc.theme.cover ? coverHtml(input, baseUrl) : ""}
<div class="layout">
${doc.theme.contents ? contentsHtml(doc, groups) : ""}
<main class="doc">
${mastheadHtml(doc)}
${sectionsHtml(doc)}
${routesHtml(input, groups, baseUrl)}
<footer class="footnote">
  <span class="credit">${LAZIFY_MARK}Generated by Lazify</span>
  <span>${escapeHtml(
			`${doc.title} · ${input.routes.length} ${
				input.routes.length === 1 ? "route" : "routes"
			} · ${input.generatedAt}`,
		)}</span>
</footer>
</main>
</div>
<script>${PAGE_SCRIPT}</script>
</body>
</html>`;
}
