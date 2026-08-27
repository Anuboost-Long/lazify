import clsx from "clsx";

import { XTermPanel } from "@renderer/features/workspace/components/XTermPanel";

import type { AgentTerminal } from "../hooks/agent-terminals";
import { AgentEmptyState } from "./AgentEmptyState";
import { AgentThemeNotice } from "./AgentThemeNotice";

interface AgentTerminalStackProps {
	terminals: AgentTerminal[];
	activeTabId: string | null;

	hidden: boolean;
	onResolveFilePath: (printedPath: string) => Promise<string | null>;
	onOpenFilePath: (absolutePath: string, line: number | null) => void;
}

export function AgentTerminalStack({
	terminals,
	activeTabId,
	hidden,
	onResolveFilePath,
	onOpenFilePath,
}: Readonly<AgentTerminalStackProps>) {
	const hasActive = terminals.some((terminal) => terminal.tabId === activeTabId);

	return (
		<div className={clsx("relative min-h-0 min-w-0 flex-1", hidden && "hidden")}>
			{hasActive ? null : <AgentEmptyState />}

			{terminals.map((terminal) =>
				terminal.runId ? (
					<div
						key={terminal.tabId}
						className="absolute inset-0 flex flex-col bg-terminal p-2"
						style={{ display: terminal.tabId === activeTabId ? "flex" : "none" }}
					>
						<AgentThemeNotice session={{ ...terminal, runId: terminal.runId }} label={terminal.label} />

						<div className="min-h-0 flex-1">
							<XTermPanel
								runId={terminal.runId}
								isActive={terminal.tabId === activeTabId}
								autoFocus
								onResolveFilePath={onResolveFilePath}
								onOpenFilePath={onOpenFilePath}
							/>
						</div>
					</div>
				) : null,
			)}
		</div>
	);
}
