import clsx from "clsx";
import { type ReactNode } from "react";

import type { ImportedProjectIndexNode } from "@renderer/shared/types/lazify";
import { SmallText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { type AgentFileMatch } from "../../hooks/use-agent-files";

export function findByAbsolutePath(
  nodes: ImportedProjectIndexNode[],
  absolutePath: string
): ImportedProjectIndexNode | null {
  for (const node of nodes) {
    if (node.absolutePath === absolutePath) return node;

    const nested = findByAbsolutePath(node.children, absolutePath);
    if (nested) return nested;
  }

  return null;
}

export function PanelMessage({ children }: Readonly<{ children: ReactNode }>) {
  return <SmallText className="!text-muted px-1.5 py-2">{children}</SmallText>;
}

export function MatchRow({
  match,
  onOpen,
  onOpenMenu
}: Readonly<{
  match: AgentFileMatch;
  onOpen: (node: ImportedProjectIndexNode) => void;
  onOpenMenu: (event: React.MouseEvent, node: ImportedProjectIndexNode) => void;
}>) {
  return (
    <button
      type="button"
      onClick={() => onOpen(match.node)}
      onContextMenu={(event) => {
        event.preventDefault();
        onOpenMenu(event, match.node);
      }}
      title={match.node.relativePath}
      className={clsx(
        "flex w-full items-center gap-1.5 rounded-lg px-1.5 py-1 text-left",
        "transition-colors hover:bg-text/[0.06]"
      )}
    >
      <UiIcon name="page" className="h-3 w-3 shrink-0 text-muted" />
      <span className="min-w-0 flex-1 truncate">
        <SmallText as="span" className="!text-text block truncate">
          {match.node.name}
        </SmallText>
        {match.directory ? (
          <SmallText as="span" className="!text-muted block truncate">
            {match.directory}
          </SmallText>
        ) : null}
      </span>
    </button>
  );
}
