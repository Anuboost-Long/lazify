import clsx from "clsx";

import { XTermPanel } from "@renderer/features/workspace/components/XTermPanel";
import { AgentEmptyState } from "./AgentEmptyState";
import type { AgentTerminal } from "../hooks/agent-terminals";

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
            className="absolute inset-0 bg-terminal p-2"
            style={{ display: terminal.tabId === activeTabId ? "block" : "none" }}
          >
            <XTermPanel
              runId={terminal.runId}
              isActive={terminal.tabId === activeTabId}
              autoFocus
              onResolveFilePath={onResolveFilePath}
              onOpenFilePath={onOpenFilePath}
            />
          </div>
        ) : null,
      )}
    </div>
  );
}
