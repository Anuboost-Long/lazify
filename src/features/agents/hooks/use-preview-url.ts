import { useEffect, useState } from "react";

const POLL_MS = 2000;

function pickPort(ports: Array<{ port: number }>): number | null {
	if (ports.length === 0) return null;
	return ports.reduce((lowest, entry) => Math.min(entry.port, lowest), ports[0].port);
}

export function usePreviewUrl(runId: string | null, isRunning: boolean): string | null {
	const [detectedUrl, setDetectedUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!runId || !isRunning) {
			setDetectedUrl(null);
			return;
		}

		let cancelled = false;

		const read = async () => {
			const sessions = await globalThis.lazify.listSessions();
			if (cancelled) return;

			const port = pickPort(sessions.find((entry) => entry.runId === runId)?.ports ?? []);

			setDetectedUrl(port === null ? null : `http://localhost:${port}`);
		};

		void read();
		const timer = setInterval(() => void read(), POLL_MS);

		return () => {
			cancelled = true;
			clearInterval(timer);
		};
	}, [runId, isRunning]);

	return detectedUrl;
}
