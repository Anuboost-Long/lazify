import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { ExtensionProvider, ServerLaunch } from "../../../extensions";
import { connect, type RpcConnection } from "./rpc";

export interface LspDiagnostic {
	range: { start: { line: number; character: number }; end: { line: number; character: number } };
	severity?: number;
	code?: string | number;
	message: string;
	source?: string;
}

const IDLE_SHUTDOWN_MS = 5 * 60_000;

export class LanguageServerSession {
	private child: ChildProcess | null = null;
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

	private start(): Promise<void> {
		const child = spawn(this.launch.command, this.launch.args, {
			cwd: this.projectPath,
			env: { ...process.env, ...this.launch.env },
			stdio: ["pipe", "pipe", "ignore"],
		});

		this.child = child;
		this.rpc = connect(child);

		child.on("exit", () => this.reset());
		child.on("error", () => this.reset());

		const folderUri = pathToFileURL(this.projectPath).href;

		this.rpc.onRequest((method, params) => {
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

		this.rpc.onNotification((method, params) => {
			if (method !== "textDocument/publishDiagnostics") return;

			const payload = params as { uri?: string; diagnostics?: LspDiagnostic[] };

			if (!payload.uri) return;

			this.waiting.get(payload.uri)?.(payload.diagnostics ?? []);
		});

		return this.rpc
			.request("initialize", {
				processId: process.pid,
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
				initializationOptions: this.provider.initializationOptions(this.projectPath),
			})
			.then(() => {
				this.rpc?.notify("initialized", {});
				this.rpc?.notify("workspace/didChangeConfiguration", {
					settings: { [this.provider.settingsSection]: this.settings() },
				});
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

		this.ready ??= this.start();
		await this.ready;
		this.touch();

		const rpc = this.rpc;

		if (!rpc) return null;

		const uri = pathToFileURL(filePath).href;
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
