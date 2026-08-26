import { useSetAtom } from "jotai";
import { useCallback } from "react";

import { toolScanLoadingAtom, toolScanReportAtom } from "./atoms";

export function useToolScan() {
	const setToolScanReport = useSetAtom(toolScanReportAtom);
	const setToolScanLoading = useSetAtom(toolScanLoadingAtom);

	const refreshToolScan = useCallback(
		async (force = false) => {
			setToolScanLoading(true);
			try {
				const report = await globalThis.lazify.scanTools(force);
				setToolScanReport(report);
			} finally {
				setToolScanLoading(false);
			}
		},
		[setToolScanLoading, setToolScanReport],
	);

	const refreshSingleTool = useCallback(
		async (toolName: string) => {
			const updated = await globalThis.lazify.probeTool(toolName);
			if (!updated) return;
			setToolScanReport((current) => {
				if (!current) return current;
				return {
					...current,
					tools: current.tools.map((t) => (t.name === toolName ? updated : t)),
				};
			});
		},
		[setToolScanReport],
	);

	return { refreshToolScan, refreshSingleTool };
}
