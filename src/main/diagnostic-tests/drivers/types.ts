import type { DiagnosticPlatform, ElementSelector, ScrollDirection } from "../types";

export type DriverCapability =
	| "launch"
	| "stop"
	| "open"
	| "tap"
	| "input"
	| "clearInput"
	| "scroll"
	| "back"
	| "visibility"
	| "url"
	| "screenshot"
	| "runtimeErrors";

export interface DiagnosticTarget {
	platform: DiagnosticPlatform;
	projectPath: string;
	baseUrl: string;
	appId: string;
	device: string;
}

export interface LaunchOptions {
	clearState: boolean;
}

export interface ScrollRequest {
	direction: ScrollDirection;
	amount: number;
	selector?: ElementSelector;
}

export interface RuntimeErrorReport {
	summary: string;
	details: string;
}

export interface DiagnosticDriver {
	readonly platform: DiagnosticPlatform;
	readonly capabilities: ReadonlySet<DriverCapability>;
	connect(target: DiagnosticTarget): Promise<void>;
	launch(options: LaunchOptions): Promise<void>;
	stop(): Promise<void>;
	open(location: string): Promise<void>;
	tap(selector: ElementSelector): Promise<void>;
	input(selector: ElementSelector, value: string): Promise<void>;
	clearInput(selector: ElementSelector): Promise<void>;
	scroll(request: ScrollRequest): Promise<void>;
	back(): Promise<void>;
	isVisible(selector: ElementSelector): Promise<boolean>;
	currentUrl(): Promise<string>;
	screenshot(filePath: string): Promise<void>;
	takeRuntimeErrors(): RuntimeErrorReport[];
	close(): Promise<void>;
}
