import { BrowserWindow, session } from "electron";

import { CdpSession } from "../drivers/web/cdp-session";
import { primeRenderer } from "../drivers/web/prime-renderer";
import { describeError } from "../errors";
import { collapseSteps, describeRecordedStep, type RecordedStep } from "./recorded-step";
import { RECORD_BINDING, RECORDER_SOURCE } from "./recorder-source";

const IGNORED_SCHEMES = ["data:", "chrome-error:", "chrome:", "devtools:"];

const VIEWPORT_WIDTH = 1280;
const VIEWPORT_HEIGHT = 900;

export type RecorderEvent =
	| { type: "step"; step: RecordedStep }
	| { type: "stopped"; steps: RecordedStep[] }
	| { type: "error"; message: string };

interface IncomingAction {
	kind: RecordedStep["kind"];
	selector?: RecordedStep["selector"];
	value?: string;
	valueFrom?: string;
}

export class RecorderSession {
	private window: BrowserWindow | null = null;
	private cdp: CdpSession | null = null;
	private readonly captured: RecordedStep[] = [];
	private readonly partition: string;

	constructor(
		readonly id: string,
		private readonly emit: (event: RecorderEvent) => void,
	) {
		this.partition = `lazify-recorder-${id}`;
	}

	private add(step: RecordedStep): void {
		this.captured.push(step);
		this.emit({ type: "step", step });
	}

	private onAction(raw: string): void {
		let action: IncomingAction;
		try {
			action = JSON.parse(raw) as IncomingAction;
		} catch {
			return;
		}

		if (!action.kind) return;

		const step: RecordedStep = {
			kind: action.kind,
			selector: action.selector,
			value: action.value,
			valueFrom: action.valueFrom,
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
			},
		});

		this.window.on("closed", () => {
			this.window = null;
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
