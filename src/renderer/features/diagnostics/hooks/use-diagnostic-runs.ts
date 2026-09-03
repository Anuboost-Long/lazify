import { useCallback, useEffect, useState } from "react";

import type { RunSummary } from "@main/diagnostic-tests/run/run-store";
import type { RunRecord } from "@main/diagnostic-tests/types";

export function useDiagnosticRuns(projectPath: string) {
	const [runs, setRuns] = useState<RunSummary[]>([]);
	const [openRun, setOpenRun] = useState<RunRecord | null>(null);

	const reload = useCallback(async () => {
		setRuns(projectPath ? await globalThis.lazify.listDiagnosticRuns(projectPath) : []);
	}, [projectPath]);

	const open = useCallback(async (runId: string) => {
		setOpenRun(await globalThis.lazify.readDiagnosticRun(runId));
	}, []);

	const close = useCallback(() => setOpenRun(null), []);

	useEffect(() => {
		setOpenRun(null);
		void reload();
	}, [reload]);

	return { runs, openRun, reload, open, close };
}
