import type { EvidenceSink } from "../../evidence/sink";
import type { RuntimeErrorReport } from "../types";
import type { CdpParams, CdpSession } from "./cdp-session";

interface ExceptionDetails {
	text?: string;
	exception?: { description?: string };
}

interface ConsoleArgument {
	value?: unknown;
	description?: string;
}

interface PendingRequest {
	url: string;
	method: string;
}

function textField(params: CdpParams, key: string, fallback = ""): string {
	const value = params[key];

	return typeof value === "string" ? value : fallback;
}

function describeArgument(argument: ConsoleArgument): string {
	if (argument.description) return argument.description;
	if (argument.value === undefined) return "";

	return typeof argument.value === "string" ? argument.value : JSON.stringify(argument.value);
}

export class PageErrorLog {
	private readonly runtimeErrors: RuntimeErrorReport[] = [];
	private readonly requests = new Map<string, PendingRequest>();

	constructor(private readonly sink: EvidenceSink) {}

	listen(session: CdpSession): void {
		session.on("Runtime.exceptionThrown", (params) => this.onException(params));
		session.on("Runtime.consoleAPICalled", (params) => this.onConsole(params));
		session.on("Network.requestWillBeSent", (params) => this.onRequestSent(params));
		session.on("Network.responseReceived", (params) => this.onResponse(params));
		session.on("Network.loadingFailed", (params) => this.onLoadingFailed(params));
	}

	private addRuntimeError(summary: string, details: string): void {
		this.runtimeErrors.push({ summary, details });
		this.sink.add({ source: "browser-console", severity: "error", summary, details });
	}

	private onException(params: CdpParams): void {
		const details = (params.exceptionDetails ?? {}) as ExceptionDetails;
		const description = details.exception?.description ?? details.text ?? "Uncaught exception";

		this.addRuntimeError(description.split("\n")[0], description);
	}

	private onConsole(params: CdpParams): void {
		if (params.type !== "error") return;

		const args = (params.args ?? []) as ConsoleArgument[];
		const message = args.map(describeArgument).filter(Boolean).join(" ") || "console.error";

		this.addRuntimeError(message.split("\n")[0].slice(0, 200), message);
	}

	private onRequestSent(params: CdpParams): void {
		const request = (params.request ?? {}) as { url?: string; method?: string };

		this.requests.set(textField(params, "requestId"), {
			url: request.url ?? "",
			method: request.method ?? "GET",
		});
	}

	private onResponse(params: CdpParams): void {
		const response = (params.response ?? {}) as { status?: number; url?: string };
		const status = response.status ?? 0;
		const pending = this.requests.get(textField(params, "requestId"));

		this.requests.delete(textField(params, "requestId"));
		if (status < 400) return;

		const method = pending?.method ?? "GET";
		const url = response.url ?? pending?.url ?? "unknown url";

		this.sink.add({
			source: "browser-network",
			severity: "error",
			summary: `${method} ${url} returned ${status}`,
			details: `${method} ${url} returned ${status}`,
		});
	}

	private onLoadingFailed(params: CdpParams): void {
		const pending = this.requests.get(textField(params, "requestId"));
		this.requests.delete(textField(params, "requestId"));

		if (params.canceled === true) return;

		const reason = textField(params, "errorText", "request failed");
		const where = pending ? `${pending.method} ${pending.url}` : "request";

		this.sink.add({
			source: "browser-network",
			severity: "error",
			summary: `${where} failed: ${reason}`,
			details: reason,
		});
	}

	takeRuntimeErrors(): RuntimeErrorReport[] {
		return this.runtimeErrors.splice(0, this.runtimeErrors.length);
	}
}
