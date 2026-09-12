import fs from "node:fs/promises";
import path from "node:path";

import { BrowserWindow, session } from "electron";

import { describeError, InfrastructureError } from "../../errors";
import { describeSelector } from "../../flow/read-selector";
import type { ElementSelector } from "../../types";
import type {
	DiagnosticDriver,
	DiagnosticTarget,
	DriverCapability,
	LaunchOptions,
	RuntimeErrorReport,
	ScrollRequest,
} from "../types";
import { CdpSession } from "./cdp-session";
import { PAGE_LOCATOR_SOURCE } from "./locator-source";
import { PageErrorLog } from "./page-errors";
import { BLANK_PAGE, primeRenderer } from "./prime-renderer";

const WEB_CAPABILITIES: DriverCapability[] = [
	"launch",
	"stop",
	"open",
	"tap",
	"input",
	"clearInput",
	"scroll",
	"back",
	"visibility",
	"url",
	"screenshot",
	"runtimeErrors",
	"dragDrop",
	"uploadFile",
];

/** Enough intermediate mouse moves for a drag to register with both native HTML5 dnd and pointer-based dnd libraries. */
const DRAG_STEPS = 12;

const VIEWPORT_WIDTH = 1280;
const VIEWPORT_HEIGHT = 900;

const SCROLL_DELTAS = {
	up: { x: 0, y: -1 },
	down: { x: 0, y: 1 },
	left: { x: -1, y: 0 },
	right: { x: 1, y: 0 },
};

interface LocatedElement {
	found: boolean;
	visible: boolean;
	x: number;
	y: number;
	tag: string;
}

interface LocateRequest {
	selector: ElementSelector;
	scrollIntoView?: boolean;
	focus?: boolean;
	selectText?: boolean;
}

export class WebDiagnosticDriver implements DiagnosticDriver {
	readonly platform = "web" as const;
	readonly capabilities = new Set(WEB_CAPABILITIES);

	private window: BrowserWindow | null = null;
	private cdp: CdpSession | null = null;
	private baseUrl = "";
	private readonly partition: string;

	constructor(
		runId: string,
		private readonly errorLog: PageErrorLog,
	) {
		this.partition = `lazify-diagnostics-${runId}`;
	}

	private get contents() {
		if (!this.window || this.window.isDestroyed()) {
			throw new InfrastructureError("The diagnostic browser window is not open");
		}

		return this.window.webContents;
	}

	async connect(target: DiagnosticTarget): Promise<void> {
		this.baseUrl = target.baseUrl;

		this.window = new BrowserWindow({
			show: false,
			width: VIEWPORT_WIDTH,
			height: VIEWPORT_HEIGHT,
			webPreferences: {
				partition: this.partition,
				contextIsolation: true,
				nodeIntegration: false,
				sandbox: true,
				backgroundThrottling: false,
			},
		});

		await primeRenderer(this.window.webContents);

		this.cdp = new CdpSession(this.window.webContents);
		this.cdp.attach();
		this.errorLog.listen(this.cdp);

		await this.cdp.send("Runtime.enable");
		await this.cdp.send("Network.enable");
		await this.cdp.send("Page.enable");
		await this.cdp.send("DOM.enable");
	}

	async launch(options: LaunchOptions): Promise<void> {
		if (options.clearState) {
			await session.fromPartition(this.partition).clearStorageData();
		}

		if (this.baseUrl) await this.open(this.baseUrl);
	}

	async stop(): Promise<void> {
		await this.contents.loadURL(BLANK_PAGE);
	}

	async open(location: string): Promise<void> {
		try {
			await this.contents.loadURL(location);
		} catch (error) {
			throw new InfrastructureError(`Could not open ${location}`, describeError(error));
		}
	}

	private async locate(request: LocateRequest): Promise<LocatedElement> {
		const call = `(${PAGE_LOCATOR_SOURCE})(${JSON.stringify(request)})`;

		return (await this.contents.executeJavaScript(call, true)) as LocatedElement;
	}

	private async requireElement(request: LocateRequest): Promise<LocatedElement> {
		const element = await this.locate({ ...request, scrollIntoView: true });

		if (!element.found) {
			throw new InfrastructureError(`No element matched ${describeSelector(request.selector)}`);
		}

		return element;
	}

	private async click(x: number, y: number): Promise<void> {
		const shared = { x, y, button: "left", clickCount: 1 };

		await this.cdp?.send("Input.dispatchMouseEvent", { ...shared, type: "mousePressed" });
		await this.cdp?.send("Input.dispatchMouseEvent", { ...shared, type: "mouseReleased" });
	}

	async tap(selector: ElementSelector): Promise<void> {
		const element = await this.requireElement({ selector });
		await this.click(element.x, element.y);
	}

	async input(selector: ElementSelector, value: string): Promise<void> {
		const element = await this.requireElement({ selector });

		await this.click(element.x, element.y);
		await this.locate({ selector, focus: true, selectText: true });
		await this.cdp?.send("Input.insertText", { text: value });
	}

	async clearInput(selector: ElementSelector): Promise<void> {
		await this.requireElement({ selector, focus: true, selectText: true });

		await this.cdp?.send("Input.dispatchKeyEvent", {
			type: "keyDown",
			key: "Backspace",
			windowsVirtualKeyCode: 8,
			nativeVirtualKeyCode: 8,
		});
		await this.cdp?.send("Input.dispatchKeyEvent", {
			type: "keyUp",
			key: "Backspace",
			windowsVirtualKeyCode: 8,
			nativeVirtualKeyCode: 8,
		});
	}

	async scroll(request: ScrollRequest): Promise<void> {
		const at = request.selector
			? await this.requireElement({ selector: request.selector })
			: { x: VIEWPORT_WIDTH / 2, y: VIEWPORT_HEIGHT / 2 };

		const delta = SCROLL_DELTAS[request.direction];

		await this.cdp?.send("Input.dispatchMouseEvent", {
			type: "mouseWheel",
			x: at.x,
			y: at.y,
			deltaX: delta.x * request.amount,
			deltaY: delta.y * request.amount,
		});
	}

	async back(): Promise<void> {
		const history = this.contents.navigationHistory;

		if (!history.canGoBack()) throw new InfrastructureError("There is no page to go back to");

		history.goBack();
	}

	async dragDrop(source: ElementSelector, target: ElementSelector): Promise<void> {
		const from = await this.requireElement({ selector: source, scrollIntoView: true });
		const to = await this.requireElement({ selector: target, scrollIntoView: true });

		// Real mouse-event sequence, not a JS-dispatched DragEvent: Chromium starts
		// native HTML5 drag-and-drop from raw input the same way it would for a
		// person, and pointer-based dnd libraries (sortable lists, kanban boards)
		// only ever listen for mouse events in the first place.
		await this.cdp?.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: from.x, y: from.y });
		await this.cdp?.send("Input.dispatchMouseEvent", {
			type: "mousePressed",
			x: from.x,
			y: from.y,
			button: "left",
			clickCount: 1,
		});

		for (let step = 1; step <= DRAG_STEPS; step += 1) {
			await this.cdp?.send("Input.dispatchMouseEvent", {
				type: "mouseMoved",
				x: from.x + ((to.x - from.x) * step) / DRAG_STEPS,
				y: from.y + ((to.y - from.y) * step) / DRAG_STEPS,
				button: "left",
			});
		}

		await this.cdp?.send("Input.dispatchMouseEvent", {
			type: "mouseReleased",
			x: to.x,
			y: to.y,
			button: "left",
			clickCount: 1,
		});
	}

	async uploadFile(selector: ElementSelector, filePath: string): Promise<void> {
		const expression = `(${PAGE_LOCATOR_SOURCE})(${JSON.stringify({ selector, returnNode: true })})`;
		const evaluated = await this.cdp?.send<{ result?: { objectId?: string } }>("Runtime.evaluate", {
			expression,
			returnByValue: false,
		});

		const objectId = evaluated?.result?.objectId;
		if (!objectId) {
			throw new InfrastructureError(`No element matched ${describeSelector(selector)}`);
		}

		try {
			// DOM.requestNode resolves nothing until the DOM domain has synced to
			// the current document — it resets on every navigation, so this has
			// to happen here, not once in connect().
			await this.cdp!.send("DOM.getDocument");
			const { nodeId } = await this.cdp!.send<{ nodeId: number }>("DOM.requestNode", { objectId });
			await this.cdp!.send("DOM.setFileInputFiles", { files: [filePath], nodeId });
		} finally {
			await this.cdp?.send("Runtime.releaseObject", { objectId }).catch(() => undefined);
		}
	}

	async isVisible(selector: ElementSelector): Promise<boolean> {
		const element = await this.locate({ selector });

		return element.found && element.visible;
	}

	currentUrl(): Promise<string> {
		return Promise.resolve(this.contents.getURL());
	}

	async screenshot(filePath: string): Promise<void> {
		const image = await this.contents.capturePage();

		await fs.mkdir(path.dirname(filePath), { recursive: true });
		await fs.writeFile(filePath, image.toPNG());
	}

	takeRuntimeErrors(): RuntimeErrorReport[] {
		return this.errorLog.takeRuntimeErrors();
	}

	close(): Promise<void> {
		this.cdp?.detach();
		this.cdp = null;

		if (this.window && !this.window.isDestroyed()) this.window.destroy();
		this.window = null;

		return Promise.resolve();
	}
}
