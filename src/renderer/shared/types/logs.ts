export type Stream = "stdout" | "stderr" | "system";

export interface LogEntry {
	key: string;
	timestamp: string;
	stream: Stream;
	message: string;
}
