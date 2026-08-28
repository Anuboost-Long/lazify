import { describe, expect, it } from "vitest";

import { fileCandidates } from "../../src/renderer/shared/terminal/file-link-provider";

function texts(printed: string) {
	return fileCandidates(printed).map((candidate) => candidate.text);
}

describe("the paths a terminal line offers as links", () => {
	it("takes a path only when it carries an extension", () => {
		expect(texts("edit src/app/page.tsx now")).toEqual(["src/app/page.tsx"]);
		expect(texts("selection_ids and end-to-end are words")).toEqual([]);
	});

	it("keeps the line and column an agent appends", () => {
		const [candidate] = fileCandidates("see src/app.tsx:42:7 for the call");

		expect(candidate.filePath).toBe("src/app.tsx");
		expect(candidate.line).toBe(42);
		expect(candidate.text).toBe("src/app.tsx:42:7");
	});

	it("leaves the punctuation that closes a sentence out of the path", () => {
		expect(texts("open package.json.")).toEqual(["package.json"]);
		expect(texts("(docs/guide.md)")).toEqual(["docs/guide.md"]);
	});

	it("points at where the path was printed", () => {
		const line = "at ~/notes/todo.md";
		const [candidate] = fileCandidates(line);

		expect(line.slice(candidate.index, candidate.index + candidate.text.length)).toBe(
			"~/notes/todo.md",
		);
	});
});
