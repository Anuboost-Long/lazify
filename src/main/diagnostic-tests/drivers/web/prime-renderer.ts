import type { WebContents } from "electron";

import { InfrastructureError } from "../../errors";

export const BLANK_PAGE = "data:text/html,%3C!doctype%20html%3E%3Ctitle%3EDiagnostics%3C/title%3E";

/**
 * CDP commands never resolve on a window that has no live renderer, so a page
 * has to be loaded and answering before the debugger is worth attaching.
 */
export async function primeRenderer(contents: WebContents): Promise<void> {
	await contents.loadURL(BLANK_PAGE).catch(() => undefined);

	const alive = await contents.executeJavaScript("1", true).catch(() => 0);

	if (alive !== 1) throw new InfrastructureError("The diagnostic browser never started");
}
