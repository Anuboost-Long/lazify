import { useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";

import { activeTabIdAtom, revealRunIdAtom, terminalsAtom } from "./terminal-store";

export function useFocusAgentRun() {
	const terminals = useAtomValue(terminalsAtom);
	const setActiveByProject = useSetAtom(activeTabIdAtom);

	return useCallback(
		(runId: string) => {
			const target = terminals.find((terminal) => terminal.runId === runId);
			if (!target) return;

			setActiveByProject((current) => ({
				...current,
				[target.projectPath]: target.tabId,
			}));
		},
		[terminals, setActiveByProject],
	);
}

export function useRevealAgentRun() {
	const setReveal = useSetAtom(revealRunIdAtom);

	return useCallback((runId: string) => setReveal(runId), [setReveal]);
}
