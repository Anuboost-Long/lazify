import clsx from "clsx";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { ImportedProjectIndexNode } from "@renderer/shared/types/lazify";
import { SmallText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { type AgentFileMatch, useAgentFiles } from "../hooks/use-agent-files";
import { AgentFileModal } from "./AgentFileModal";

interface AgentFilesPanelProps {
  projectPath: string;
  /** Null when no terminal is open to send a path to. */
  onSendToTerminal: ((text: string) => void) | null;
  onClose: () => void;
}

interface TreeRowProps {
  node: ImportedProjectIndexNode;
  depth: number;
  openFolders: string[];
  onToggleFolder: (id: string) => void;
  onOpenFile: (node: ImportedProjectIndexNode) => void;
}

/** One row of the tree, recursing into folders the user has opened. */
function TreeRow({ node, depth, openFolders, onToggleFolder, onOpenFile }: Readonly<TreeRowProps>) {
  const isFolder = node.type === "folder";
  const isOpen = isFolder && openFolders.includes(node.id);

  return (
    <>
      <button
        type="button"
        onClick={() => (isFolder ? onToggleFolder(node.id) : onOpenFile(node))}
        title={node.relativePath}
        style={{ paddingLeft: `${depth * 10 + 6}px` }}
        className={clsx(
          "flex w-full items-center gap-1.5 rounded-lg py-1 pr-1.5 text-left",
          "transition-colors hover:bg-text/[0.06]"
        )}
      >
        <UiIcon
          name={isFolder ? "folder" : "page"}
          className={clsx("h-3 w-3 shrink-0", isFolder ? "text-accent/70" : "text-muted")}
        />
        <SmallText as="span" className="!text-text truncate">
          {node.name}
        </SmallText>
      </button>

      {isOpen
        ? node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              openFolders={openFolders}
              onToggleFolder={onToggleFolder}
              onOpenFile={onOpenFile}
            />
          ))
        : null}
    </>
  );
}

/** Placeholder line used for loading and empty states. */
function PanelMessage({ children }: Readonly<{ children: ReactNode }>) {
  return <SmallText className="!text-muted px-1.5 py-2">{children}</SmallText>;
}

/** A search hit: file name over the folder that holds it. */
function MatchRow({
  match,
  onOpen
}: Readonly<{ match: AgentFileMatch; onOpen: (node: ImportedProjectIndexNode) => void }>) {
  return (
    <button
      type="button"
      onClick={() => onOpen(match.node)}
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

/**
 * Browsing the project while an agent works, so a component can be looked up
 * and referenced without leaving the page or interrupting the session.
 */
export function AgentFilesPanel({
  projectPath,
  onSendToTerminal,
  onClose
}: Readonly<AgentFilesPanelProps>) {
  const { t } = useTranslation();
  const { tree, loading, query, setQuery, matches, searching, refresh } = useAgentFiles(
    projectPath,
    true
  );
  const [openFolders, setOpenFolders] = useState<string[]>([]);
  const [selected, setSelected] = useState<ImportedProjectIndexNode | null>(null);

  const toggleFolder = (id: string) =>
    setOpenFolders((open) =>
      open.includes(id) ? open.filter((entry) => entry !== id) : [...open, id]
    );

  /** Search results, the tree, or whichever message stands in for them. */
  const renderBody = () => {
    if (loading && tree.length === 0) {
      return <PanelMessage>{t(translation.GlobalTerm.Loading)}</PanelMessage>;
    }

    if (searching) {
      if (matches.length === 0) {
        return <PanelMessage>{t(translation.Agents.NoFilesFound)}</PanelMessage>;
      }

      return matches.map((match) => (
        <MatchRow key={match.node.id} match={match} onOpen={setSelected} />
      ));
    }

    if (tree.length === 0) {
      return <PanelMessage>{t(translation.Agents.NoFilesFound)}</PanelMessage>;
    }

    return tree.map((node) => (
      <TreeRow
        key={node.id}
        node={node}
        depth={0}
        openFolders={openFolders}
        onToggleFolder={toggleFolder}
        onOpenFile={setSelected}
      />
    ));
  };

  return (
    <aside
      className={clsx(
        "flex w-72 shrink-0 flex-col overflow-hidden border-l border-border",
        "bg-text/[0.02]"
      )}
    >
      <header className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        <UiIcon name="folder" className="ml-1 h-3.5 w-3.5 text-muted" />
        <SmallText as="span" className="!text-text truncate">
          {t(translation.Agents.Files)}
        </SmallText>

        <div className="ml-auto flex items-center">
          <IconButton
            icon="refresh-circle"
            aria-label={t(translation.GlobalTerm.Refresh)}
            onClick={() => void refresh()}
            iconClassName={loading ? "animate-spin" : undefined}
            className="text-text"
          />
          <IconButton
            icon="xmark"
            aria-label={t(translation.GlobalTerm.Close)}
            onClick={onClose}
            className="text-text"
          />
        </div>
      </header>

      <div className="border-b border-border p-1.5">
        <div className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1">
          <UiIcon name="search" className="h-3 w-3 shrink-0 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t(translation.Agents.FindFile)}
            className={clsx(
              "min-w-0 flex-1 bg-transparent text-[11px] text-text outline-none",
              "placeholder:text-muted"
            )}
          />
          {query ? (
            <IconButton
              icon="xmark"
              aria-label={t(translation.GlobalTerm.Close)}
              onClick={() => setQuery("")}
              className="text-muted hover:bg-text/10 dark:hover:bg-text/10"
            />
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-1.5">{renderBody()}</div>

      <AgentFileModal
        file={selected}
        onSendToTerminal={onSendToTerminal}
        onClose={() => setSelected(null)}
      />
    </aside>
  );
}
