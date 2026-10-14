import { type LanguageServerProcess, startLanguageServer } from "@/platform/language-servers";
import type { ExtensionProvider, ServerLaunch } from "@/shared/lib/extensions";
import path from "@/shared/lib/path";

import { connect, type RpcConnection } from "./rpc";

export interface LspDiagnostic {
	range: { start: { line: number; character: number }; end: { line: number; character: number } };
	severity?: number;
	code?: string | number;
	message: string;
	source?: string;
}

const IDLE_SHUTDOWN_MS = 5 * 60_000;

/** Node's `pathToFileURL`: `%` is escaped first, the URL setter does the rest. */
function pathToFileUrl(filePath: string): string {
	const url = new URL("file://");

	url.pathname = filePath.replaceAll("%", "%25");

	return url.href;
}

export class LanguageServerSession {
	private child: LanguageServerProcess | null = null;
	private rpc: RpcConnection | null = null;
	private ready: Promise<void> | null = null;
	private readonly openDocuments = new Map<string, number>();
	private readonly waiting = new Map<string, (found: LspDiagnostic[]) => void>();
	private idleTimer: ReturnType<typeof setTimeout> | null = null;
	private served = false;

	constructor(
		private readonly provider: ExtensionProvider,
		private readonly launch: ServerLaunch,
		private readonly projectPath: string,
		private readonly firstResultTimeoutMs: number,
		private readonly resultTimeoutMs: number,
	) {}

	private settings() {
		return this.provider.defaultSettings();
	}

	private async start(): Promise<void> {
		let rpc: RpcConnection | null = null;
		const child = await startLanguageServer(
			this.launch.command,
			this.launch.args,
			{ cwd: this.projectPath, env: this.launch.env },
			(bytes) => rpc?.receive(bytes),
		);

		rpc = connect(child.write);
		this.child = child;
		this.rpc = rpc;

		void child.exited.then(() => {
			if (this.child === child) this.reset();
		});

		const folderUri = pathToFileUrl(this.projectPath);

		rpc.onRequest((method, params) => {
			if (method === "workspace/configuration") {
				const items = (params as { items?: unknown[] })?.items ?? [];

				return items.map(() => this.settings());
			}

			if (method === "workspace/workspaceFolders") {
				return [{ uri: folderUri, name: path.basename(this.projectPath) }];
			}

			if (method === "sonarlint/shouldAnalyseFile") return { shouldBeAnalysed: true };
			if (method === "sonarlint/isOpenInEditor") return true;
			if (method === "sonarlint/listFilesInFolder") return { foundFiles: [] };
			if (method === "sonarlint/getFilePatternsForAnalysis") return { patterns: ["**/*"] };

			return null;
		});

		rpc.onNotification((method, params) => {
			if (method !== "textDocument/publishDiagnostics") return;

			const payload = params as { uri?: string; diagnostics?: LspDiagnostic[] };

			if (!payload.uri) return;

			this.waiting.get(payload.uri)?.(payload.diagnostics ?? []);
		});

		await rpc.request("initialize", {
			processId: null,
			rootUri: folderUri,
			workspaceFolders: [{ uri: folderUri, name: path.basename(this.projectPath) }],
			capabilities: {
				workspace: {
					configuration: true,
					didChangeConfiguration: { dynamicRegistration: true },
					workspaceFolders: true,
				},
				textDocument: {
					publishDiagnostics: { relatedInformation: true },
					synchronization: { dynamicRegistration: true },
				},
				window: { workDoneProgress: true, showMessage: {} },
			},
			initializationOptions: await this.provider.initializationOptions(this.projectPath),
		});

		rpc.notify("initialized", {});
		rpc.notify("workspace/didChangeConfiguration", {
			settings: { [this.provider.settingsSection]: this.settings() },
		});
	}

	private reset() {
		this.child = null;
		this.rpc = null;
		this.ready = null;
		this.openDocuments.clear();
		this.waiting.forEach((resolve) => resolve([]));
		this.waiting.clear();
	}

	private touch() {
		if (this.idleTimer) clearTimeout(this.idleTimer);

		this.idleTimer = setTimeout(() => this.dispose(), IDLE_SHUTDOWN_MS);
	}

	async diagnose(filePath: string, content: string): Promise<LspDiagnostic[] | null> {
		const languageId = this.provider.languageIdFor(filePath);

		if (!languageId) return null;

		this.ready ??= this.start().catch((error: unknown) => {
			this.dispose();
			throw error;
		});
		await this.ready;
		this.touch();

		const rpc = this.rpc;

		if (!rpc) return null;

		const uri = pathToFileUrl(filePath);
		const version = (this.openDocuments.get(uri) ?? 0) + 1;
		const timeout = this.served ? this.resultTimeoutMs : this.firstResultTimeoutMs;

		const settled = new Promise<LspDiagnostic[] | null>((resolve) => {
			const timer = setTimeout(() => {
				this.waiting.delete(uri);
				resolve(null);
			}, timeout);

			this.waiting.set(uri, (found) => {
				clearTimeout(timer);
				this.waiting.delete(uri);
				resolve(found);
			});
		});

		if (this.openDocuments.has(uri)) {
			rpc.notify("textDocument/didChange", {
				textDocument: { uri, version },
				contentChanges: [{ text: content }],
			});
		} else {
			rpc.notify("textDocument/didOpen", {
				textDocument: { uri, languageId, version, text: content },
			});
		}

		this.openDocuments.set(uri, version);

		const result = await settled;

		if (result !== null) this.served = true;

		return result;
	}

	dispose() {
		if (this.idleTimer) clearTimeout(this.idleTimer);

		this.idleTimer = null;
		this.child?.kill();
		this.reset();
		this.served = false;
	}
}
