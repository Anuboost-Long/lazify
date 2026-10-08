import { execFile } from "./exec";

const OPENABLE_URL = /^(https?:|mailto:)/i;

export async function openExternalUrl(url: string): Promise<void> {
	if (!OPENABLE_URL.test(url)) throw new Error(`Only web and mail links can be opened: ${url}`);
	await execFile("open", [url]);
}

export async function revealInFileManager(targetPath: string): Promise<void> {
	await execFile("open", ["-R", targetPath]);
}

export async function openTerminal(targetPath: string): Promise<void> {
	await execFile("open", ["-a", "Terminal", targetPath]);
}
