import { renderPdf } from "@/platform/pdf";
import { writeFileBytes } from "@/platform/folders";

import type { DocTheme } from "../types";
import { PAGE_MARGINS } from "./theme";

function footer(title: string) {
	return { left: title, right: "{page} / {pages}" };
}

export async function writeDocPdf(
	html: string,
	theme: DocTheme,
	title: string,
	filePath: string,
): Promise<string> {
	const bytes = await renderPdf(html, {
		paper: theme.pageSize === "Letter" ? "letter" : "a4",
		margins: PAGE_MARGINS[theme.margin],
		printBackground: true,
		colorScheme: "light",
		title,
		footer: footer(title),
	});

	await writeFileBytes(filePath, bytes);

	return filePath;
}
