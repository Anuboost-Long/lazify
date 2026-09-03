import { useCallback, useEffect, useState } from "react";

import type { FlowSummary } from "@main/diagnostic-tests/service";

export function useDiagnosticFlows(projectPath: string) {
	const [flows, setFlows] = useState<FlowSummary[]>([]);
	const [loading, setLoading] = useState(false);

	const reload = useCallback(async () => {
		if (!projectPath) {
			setFlows([]);
			return;
		}

		setLoading(true);
		try {
			setFlows(await globalThis.lazify.listDiagnosticFlows(projectPath));
		} finally {
			setLoading(false);
		}
	}, [projectPath]);

	const addExampleFlow = useCallback(async () => {
		if (!projectPath) return;

		await globalThis.lazify.createExampleDiagnosticFlow(projectPath);
		await reload();
	}, [projectPath, reload]);

	useEffect(() => {
		void reload();
	}, [reload]);

	return { flows, loading, reload, addExampleFlow };
}
