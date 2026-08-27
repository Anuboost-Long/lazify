import path from "node:path";

import { readCustomCollections } from "../custom-collections";
import type { ApiRouteSource } from "../types";
import { briefFiles, HOUSE_RULES } from "./brief";
import { gapKey } from "./gap-key";
import { heldRequests } from "./outline";
import { FOLDER_SECTION, sectionSpec, sectionTitle } from "./sections";
import type { CollectionDoc, DocGap } from "./types";

function whereOf(gap: DocGap, doc: CollectionDoc, sources: Map<string, string>): string {
	if (gap.requestId) return sources.get(gap.requestId) ?? gap.where;
	if (gap.folderId) return `folder ${gap.where}`;

	return doc.title || gap.where;
}

/** Where the answer to this gap belongs in the answer file. */
function targetOf(gap: DocGap): string {
	if (gap.requestId) {
		return `"routes": [{ "requestId": "${gap.requestId}", "sections": { "${gap.sectionId}": "…" } }]`;
	}

	if (gap.folderId) return `"folders": [{ "id": "${gap.folderId}", "description": "…" }]`;

	return `"collection": { "${gap.sectionId}": "…" }`;
}

function asked(gap: DocGap, index: number, doc: CollectionDoc, sources: Map<string, string>) {
	const scope = gap.requestId ? "route" : "collection";
	const target = targetOf(gap);

	return [
		`${index + 1}. ${sectionTitle(scope, gap.sectionId)} · ${whereOf(gap, doc, sources)}`,
		`   Question: ${gap.question}`,
		`   Write it into: ${target}`,
	].join("\n");
}

/** Where the route was found, for a writer who has to go and read it. */
function declaredAt(source: ApiRouteSource): string {
	if (!source.filePath) return "source file unknown";

	const at = source.line ? `:${source.line}` : "";

	return `declared in ${source.filePath}${at}`;
}

/** A field with no standing question still has one: what its section is for. */
function asIfAsked(key: string, doc: CollectionDoc): DocGap | null {
	const [requestId, folderId, sectionId] = key.split("|");
	const scope = requestId ? "route" : "collection";
	const spec = sectionId === FOLDER_SECTION.id ? FOLDER_SECTION : sectionSpec(scope, sectionId);

	if (!spec) return null;

	const folder = doc.folders.find((one) => one.id === folderId);

	return {
		requestId: requestId || null,
		folderId: folderId || undefined,
		sectionId,
		where: folder?.name ?? doc.title,
		question: spec.hint,
	};
}

export function docQuestionPrompt(
	projectPath: string,
	collectionId: string,
	doc: CollectionDoc,
	gaps: DocGap[],
	keys: string[],
): string | null {
	const collection = readCustomCollections(projectPath).find((one) => one.id === collectionId);

	if (!collection) return null;

	const standing = new Map(gaps.map((gap) => [gapKey(gap), gap]));
	const picked =
		keys.length > 0
			? keys.flatMap((key) => {
					const asked = standing.get(key) ?? asIfAsked(key, doc);

					return asked ? [asked] : [];
				})
			: gaps;

	if (picked.length === 0) return null;

	const files = briefFiles(projectPath, collection);
	const relative = (filePath: string) =>
		path.relative(path.resolve(projectPath), filePath).split(path.sep).join("/");
	const sources = new Map(
		heldRequests(collection).map(({ request }) => [
			request.id,
			[`${request.route.method} ${request.route.path}`, declaredAt(request.route.source)].join(" · "),
		]),
	);

	return `You are filling gaps in the API documentation for ${doc.title || collection.name}.

The scan could not answer ${picked.length === 1 ? "this question" : `these ${picked.length} questions`}. Read the source in this project before answering each one — do not guess.

${picked.map((gap, index) => asked(gap, index, doc, sources)).join("\n\n")}

Answer by writing JSON into ${relative(files.answerPath)}:
{ "collection": { "<section id>": "markdown" }, "folders": [ { "id": "<folder id>", "description": "markdown" } ], "routes": [ { "requestId": "<id>", "sections": { "<section id>": "markdown" } } ] }

- Merge into that file if it already exists; include only what you answered.
- Plain markdown: paragraphs, - lists, **bold**, \`code\`, fenced blocks.
- ${relative(files.jobPath)} holds every route with what was already discovered, if it helps.

Rules:
${HOUSE_RULES.map((rule) => `- ${rule}`).join("\n")}

When you are done, say which questions you answered and which you could not.
`;
}
