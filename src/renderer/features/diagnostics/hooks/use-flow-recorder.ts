import { useCallback, useEffect, useState } from "react";

import type { RecordedStep } from "@main/diagnostic-tests/recorder/recorded-step";

export interface RecordingState {
	live: boolean;
	steps: RecordedStep[];
	url: string;
	name: string;
	error: string;
}

function fileNameFor(name: string): string {
	const slug = name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.split("-")
		.filter(Boolean)
		.join("-");

	return `${slug || "recorded-flow"}.yaml`;
}

export function useFlowRecorder(projectPath: string) {
	const [recording, setRecording] = useState<RecordingState | null>(null);

	useEffect(
		() =>
			globalThis.lazify.onDiagnosticRecorderEvent((event) =>
				setRecording((current) => {
					if (!current) return current;
					if (event.type === "step") return { ...current, steps: [...current.steps, event.step] };
					if (event.type === "error") return { ...current, error: event.message };

					return { ...current, live: false, steps: event.steps };
				}),
			),
		[],
	);

	useEffect(() => {
		setRecording(null);
	}, [projectPath]);

	const start = useCallback(
		async (url: string) => {
			setRecording({ live: true, steps: [], url, name: "", error: "" });

			try {
				const handle = await globalThis.lazify.startDiagnosticRecording(projectPath, url);
				setRecording((current) => (current ? { ...current, url: handle.url } : current));
			} catch (error) {
				setRecording({
					live: false,
					steps: [],
					url,
					name: "",
					error: error instanceof Error ? error.message : String(error),
				});
			}
		},
		[projectPath],
	);

	const stop = useCallback(async () => {
		const steps = await globalThis.lazify.stopDiagnosticRecording();

		setRecording((current) => (current ? { ...current, live: false, steps } : current));
	}, []);

	const rename = useCallback((name: string) => {
		setRecording((current) => (current ? { ...current, name } : current));
	}, []);

	const discard = useCallback(async () => {
		if (recording?.live) await globalThis.lazify.stopDiagnosticRecording();

		setRecording(null);
	}, [recording?.live]);

	const save = useCallback(async () => {
		if (!recording || recording.steps.length === 0) return null;

		const name = recording.name.trim();
		if (!name) return null;

		const saved = await globalThis.lazify.saveDiagnosticRecording(
			projectPath,
			fileNameFor(name),
			name,
			recording.steps,
		);

		setRecording(null);

		return saved;
	}, [projectPath, recording]);

	return { recording, start, stop, rename, discard, save };
}
