export function formatDuration(milliseconds: number): string {
	if (milliseconds < 1000) return `${Math.max(0, Math.round(milliseconds))}ms`;

	const seconds = milliseconds / 1000;
	if (seconds < 60) return `${seconds.toFixed(1)}s`;

	const minutes = Math.floor(seconds / 60);

	return `${minutes}m ${String(Math.floor(seconds % 60)).padStart(2, "0")}s`;
}

export function formatRunTime(isoDate: string): string {
	const parsed = new Date(isoDate);
	if (Number.isNaN(parsed.getTime())) return "";

	return parsed.toLocaleString(undefined, {
		day: "numeric",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
	});
}
