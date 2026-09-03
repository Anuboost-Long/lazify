import { normalizeScreen, stripAnsi } from "../../agents/terminal-intent";
import type { EvidenceSink } from "./sink";

const TRANSCRIPT_LIMIT_BYTES = 2_000_000;

const ERROR_SIGNALS = [
	/\berror\b/i,
	/\bexception\b/i,
	/\bunhandled\b/i,
	/\bfailed to\b/i,
	/\bECONN(?:REFUSED|RESET)\b/,
	/\bEADDRINUSE\b/,
];

const WARNING_SIGNALS = [/\bwarn(?:ing)?\b/i, /\bdeprecated\b/i];

function severityOf(line: string): "error" | "warning" | null {
	if (ERROR_SIGNALS.some((signal) => signal.test(line))) return "error";
	if (WARNING_SIGNALS.some((signal) => signal.test(line))) return "warning";

	return null;
}

export class TerminalCollector {
	private readonly chunks: string[] = [];
	private transcriptBytes = 0;
	private pending = "";
	private readonly seen = new Set<string>();

	constructor(private readonly sink: EvidenceSink) {}

	record(data: string): void {
		this.chunks.push(data);
		this.transcriptBytes += data.length;

		while (this.transcriptBytes > TRANSCRIPT_LIMIT_BYTES && this.chunks.length > 1) {
			this.transcriptBytes -= this.chunks.shift()!.length;
		}

		this.pending = stripAnsi(this.pending + data).replace(/\r\n?/g, "\n");

		const lines = this.pending.split("\n");
		this.pending = lines.pop() ?? "";

		for (const line of lines) this.consider(line);
	}

	private consider(rawLine: string): void {
		const text = rawLine.trim();
		if (!text || this.seen.has(text)) return;

		const severity = severityOf(text);
		if (!severity) return;

		this.seen.add(text);
		this.sink.add({
			source: "terminal",
			severity,
			summary: text.slice(0, 200),
			details: text,
		});
	}

	finish(): void {
		if (this.pending.trim()) this.consider(this.pending);
		this.pending = "";
	}

	transcript(): string {
		return normalizeScreen(this.chunks.join(""));
	}
}
