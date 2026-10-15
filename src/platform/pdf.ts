import { desktop } from "@chain/sdk";
import type { RenderPdfOptions } from "@chain/sdk";

/** Renders to the app's managed file storage, then hands back the bytes directly — the caller places them wherever it needs. */
export async function renderPdf(html: string, options: RenderPdfOptions): Promise<Uint8Array> {
	const rendered = await desktop.pdf.render(html, options);

	try {
		return await desktop.files.read(rendered.reference);
	} finally {
		await desktop.files.delete(rendered.reference);
	}
}
