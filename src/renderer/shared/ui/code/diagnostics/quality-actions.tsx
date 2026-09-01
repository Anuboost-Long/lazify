import { createContext, useContext, type ReactNode } from "react";

import type { FindingReference } from "@main/linting";

/**
 * What can be done with findings, published by whoever can actually do it.
 *
 * The surface knows what was found and what the code around it says; it does
 * not know what an agent is, which project it would run in, or where tasks are
 * kept. So it hands the findings over and someone above picks them up — the
 * same split the selection actions and the send-a-file action already use.
 *
 * Both actions take a list. The hover card sends the one finding under the
 * pointer, the findings panel sends everything ticked, and neither the card nor
 * the panel has to know which case it is.
 */
export interface CodeQualityActions {
	fix: (findings: FindingReference[]) => void;
	/** Absent where tasks cannot be reached from this surface. */
	createTask?: (findings: FindingReference[]) => void;
}

const CodeQualityContext = createContext<CodeQualityActions | null>(null);

export function CodeQualityActionsProvider({
	actions,
	children,
}: Readonly<{ actions: CodeQualityActions; children: ReactNode }>) {
	return <CodeQualityContext.Provider value={actions}>{children}</CodeQualityContext.Provider>;
}

/** Null where nothing above can act, which is what hides the buttons. */
export function useCodeQualityActions() {
	return useContext(CodeQualityContext);
}
