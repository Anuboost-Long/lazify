import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { BrowserWindow, session } from "electron";

import { CdpSession } from "../drivers/web/cdp-session";
import { primeRenderer } from "../drivers/web/prime-renderer";
import { describeError } from "../errors";
import { fixturesDirectory } from "../flow/flow-files";
import { collapseSteps, describeRecordedStep, type RecordedStep } from "./recorded-step";
import { RECORD_BINDING, RECORDER_SOURCE } from "./recorder-source";

const IGNORED_SCHEMES = ["data:", "chrome-error:", "chrome:", "devtools:"];

const VIEWPORT_WIDTH = 1280;
const VIEWPORT_HEIGHT = 900;

/** Kept identical in `src/preload/diagnostics-recorder.ts` — see the note there. */
const FILE_PATH_CHANNEL = "lazify:diagnostics-recorder-file-path";

/** How long a resolved file path stays eligible to be paired with the upload step it belongs to. */
const FILE_PATH_TTL_MS = 4000;

const RECORDER_PRELOAD = path.join(__dirname, "../../../preload/diagnostics-recorder.js");

interface PendingFile {
	name: string;
	path: string;
	at: number;
}

export type RecorderEvent =
	| { type: "step"; step: RecordedStep }
	| { type: "stopped"; steps: RecordedStep[] }
	| { type: "error"; message: string };

interface IncomingAction {
	kind: RecordedStep["kind"];
	selector?: RecordedStep["selector"];
	value?: string;
	valueFrom?: string;
	/** uploadFile only: the input's chosen file name, to pair with the preload's resolved path. */
	fileName?: string;
	/** dragDrop only: where the drag ends up. */
	targetSelector?: RecordedStep["targetSelector"];
}

export class RecorderSession {
	private window: BrowserWindow | null = null;
	private cdp: CdpSession | null = null;
	private readonly captured: RecordedStep[] = [];
	private readonly partition: string;
	private readonly pendingFiles: PendingFile[] = [];

	constructor(
		readonly id: string,
		private readonly projectPath: string,
		private readonly emit: (event: RecorderEvent) => void,
	) {
		this.partition = `lazify-recorder-${id}`;
	}

	private add(step: RecordedStep): void {
		this.captured.push(step);
		this.emit({ type: "step", step });
	}

	private onFilePathResolved(name: string, filePath: string): void {
		this.pendingFiles.push({ name, path: filePath, at: Date.now() });
	}

	private takeRecentFile(name: string): PendingFile | null {
		const now = Date.now();
		const fresh = this.pendingFiles.filter((file) => now - file.at < FILE_PATH_TTL_MS);

		this.pendingFiles.length = 0;
		this.pendingFiles.push(...fresh);

		const match = fresh.find((file) => file.name === name) ?? fresh[0] ?? null;
		if (match) this.pendingFiles.splice(this.pendingFiles.indexOf(match), 1);

		return match;
	}

	private async copyFixture(sourcePath: string, name: string): Promise<string> {
		const directory = fixturesDirectory(this.projectPath);
		await fs.mkdir(directory, { recursive: true });

		let target = path.join(directory, name);
		const alreadyThere = await fs.access(target).then(
			() => true,
			() => false,
		);

		if (alreadyThere) {
			const extension = path.extname(name);
			const base = name.slice(0, name.length - extension.length);
			target = path.join(directory, `${base}-${randomBytes(3).toString("hex")}${extension}`);
		}

		await fs.copyFile(sourcePath, target);

		return path.relative(this.projectPath, target).split(path.sep).join("/");
	}

	/**
	 * The recorder's page script and this preload both react to the same native
	 * "change" event but arrive over different transports (a CDP binding call vs.
	 * an ipc message), so the file path can lag the step by a beat. A short poll
	 * closes that gap without blocking the rest of the recording.
	 */
	private async handleUploadFile(action: IncomingAction): Promise<void> {
		const fileName = action.fileName ?? "";

		let pending: PendingFile | null = null;
		for (let attempt = 0; attempt < 10 && !pending; attempt += 1) {
			pending = this.takeRecentFile(fileName);
			if (!pending) await new Promise((resolve) => setTimeout(resolve, 50));
		}

		if (!pending) {
			this.emit({
				type: "error",
				message: `Could not read the path for "${fileName}". Try picking the file again.`,
			});
			return;
		}

		let file: string;
		try {
			file = await this.copyFixture(pending.path, pending.name);
		} catch (error) {
			this.emit({ type: "error", message: `Could not copy ${pending.name}: ${describeError(error)}` });
			return;
		}

		const step: RecordedStep = {
			kind: "uploadFile",
			selector: action.selector,
			file,
			at: Date.now(),
			description: "",
		};

		this.add({ ...step, description: describeRecordedStep(step) });
	}

	private onAction(raw: string): void {
		let action: IncomingAction;
		try {
			action = JSON.parse(raw) as IncomingAction;
		} catch {
			return;
		}

		if (!action.kind) return;

		if (action.kind === "uploadFile") {
			void this.handleUploadFile(action);
			return;
		}

		const step: RecordedStep = {
			kind: action.kind,
			selector: action.selector,
			value: action.value,
			valueFrom: action.valueFrom,
			targetSelector: action.targetSelector,
			at: Date.now(),
			description: "",
		};

		this.add({ ...step, description: describeRecordedStep(step) });
	}

	private onNavigated(url: string): void {
		if (!url || url === "about:blank") return;
		if (IGNORED_SCHEMES.some((scheme) => url.startsWith(scheme))) return;

		const step: RecordedStep = { kind: "open", url, at: Date.now(), description: "" };

		this.add({ ...step, description: describeRecordedStep(step) });
	}

	async start(url: string): Promise<void> {
		this.window = new BrowserWindow({
			show: true,
			width: VIEWPORT_WIDTH,
			height: VIEWPORT_HEIGHT,
			title: "Lazify — recording a flow",
			webPreferences: {
				partition: this.partition,
				contextIsolation: true,
				nodeIntegration: false,
				sandbox: true,
				backgroundThrottling: false,
				preload: RECORDER_PRELOAD,
			},
		});

		this.window.on("closed", () => {
			this.window = null;
		});

		this.window.webContents.ipc.on(FILE_PATH_CHANNEL, (_event, payload: unknown) => {
			const { name, path: filePath } = (payload ?? {}) as { name?: unknown; path?: unknown };

			if (typeof name === "string" && typeof filePath === "string") {
				this.onFilePathResolved(name, filePath);
			}
		});

		await primeRenderer(this.window.webContents);

		this.cdp = new CdpSession(this.window.webContents);
		this.cdp.attach();

		this.cdp.on("Runtime.bindingCalled", (params) => {
			if (params.name === RECORD_BINDING && typeof params.payload === "string") {
				this.onAction(params.payload);
			}
		});

		this.cdp.on("Page.frameNavigated", (params) => {
			const frame = (params.frame ?? {}) as { url?: string; parentId?: string };
			if (frame.parentId) return;

			this.onNavigated(frame.url ?? "");
		});

		await this.cdp.send("Runtime.enable");
		await this.cdp.send("Page.enable");
		await this.cdp.send("Runtime.addBinding", { name: RECORD_BINDING });
		await this.cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: RECORDER_SOURCE });

		try {
			await this.window.webContents.loadURL(url);
		} catch (error) {
			this.emit({
				type: "error",
				message: `Could not open ${url}. Start it, then navigate in the recording window. (${describeError(error)})`,
			});
		}
	}

	steps(): RecordedStep[] {
		return collapseSteps(this.captured);
	}

	async stop(): Promise<RecordedStep[]> {
		this.cdp?.detach();
		this.cdp = null;

		if (this.window && !this.window.isDestroyed()) this.window.destroy();
		this.window = null;

		await session
			.fromPartition(this.partition)
			.clearStorageData()
			.catch(() => undefined);

		const steps = this.steps();
		this.emit({ type: "stopped", steps });

		return steps;
	}
}
