import type {
	DiagnosticDriver,
	DriverCapability,
	RuntimeErrorReport,
	ScrollRequest,
} from "../../../src/main/diagnostic-tests/drivers/types";
import type { ElementSelector } from "../../../src/main/diagnostic-tests/types";

const ALL_CAPABILITIES: DriverCapability[] = [
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
];

export interface FakeDriverOptions {
	visible?: (selector: ElementSelector) => boolean;
	url?: string;
	runtimeErrors?: RuntimeErrorReport[];
	capabilities?: DriverCapability[];
}

export class FakeDriver implements DiagnosticDriver {
	readonly platform = "web" as const;
	readonly capabilities: Set<DriverCapability>;
	readonly calls: string[] = [];

	private url: string;
	private readonly runtimeErrors: RuntimeErrorReport[];

	constructor(private readonly options: FakeDriverOptions = {}) {
		this.capabilities = new Set(options.capabilities ?? ALL_CAPABILITIES);
		this.url = options.url ?? "http://localhost:3000/";
		this.runtimeErrors = options.runtimeErrors ?? [];
	}

	private record(call: string): Promise<void> {
		this.calls.push(call);

		return Promise.resolve();
	}

	connect() {
		return this.record("connect");
	}

	launch() {
		return this.record("launch");
	}

	stop() {
		return this.record("stop");
	}

	open(location: string) {
		this.url = location;

		return this.record(`open ${location}`);
	}

	tap(selector: ElementSelector) {
		return this.record(`tap ${JSON.stringify(selector)}`);
	}

	input(selector: ElementSelector, value: string) {
		return this.record(`input ${JSON.stringify(selector)} ${value}`);
	}

	clearInput(selector: ElementSelector) {
		return this.record(`clearInput ${JSON.stringify(selector)}`);
	}

	scroll(request: ScrollRequest) {
		return this.record(`scroll ${request.direction}`);
	}

	back() {
		return this.record("back");
	}

	isVisible(selector: ElementSelector) {
		return Promise.resolve(this.options.visible ? this.options.visible(selector) : true);
	}

	currentUrl() {
		return Promise.resolve(this.url);
	}

	screenshot(filePath: string) {
		return this.record(`screenshot ${filePath}`);
	}

	takeRuntimeErrors(): RuntimeErrorReport[] {
		return this.runtimeErrors.splice(0, this.runtimeErrors.length);
	}

	close() {
		return this.record("close");
	}
}
