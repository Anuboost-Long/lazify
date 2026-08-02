import clsx from "clsx";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { ImportedProjectIndexNode } from "@renderer/shared/types/lazify";
import { SmallText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { SymbolPosition } from "@renderer/shared/ui/code/symbol-at-point";
import { TreeContextMenu } from "@renderer/shared/ui/project-tree/TreeContextMenu";
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
  onOpenMenu: (event: React.MouseEvent, node: ImportedProjectIndexNode) => void;
}

/** One row of the tree, recursing into folders the user has opened. */
function TreeRow({
  node,
  depth,
  openFolders,
  onToggleFolder,
  onOpenFile,
  onOpenMenu
}: Readonly<TreeRowProps>) {
  const isFolder = node.type === "folder";
  const isOpen = isFolder && openFolders.includes(node.id);

  return (
    <>
      <button
        type="button"
        onClick={() => (isFolder ? onToggleFolder(node.id) : onOpenFile(node))}
        onContextMenu={(event) => {
          event.preventDefault();
          onOpenMenu(event, node);
        }}
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
              onOpenMenu={onOpenMenu}
            />
          ))
        : null}
    </>
  );
}

/** The indexed node for an absolute path, or null when it is not in the tree. */
function findByAbsolutePath(
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

/** Placeholder line used for loading and empty states. */
function PanelMessage({ children }: Readonly<{ children: ReactNode }>) {
  return <SmallText className="!text-muted px-1.5 py-2">{children}</SmallText>;
}

/** A search hit: file name over the folder that holds it. */
function MatchRow({
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
  /** Files jumped away from, newest last, so a jump can be walked back. */
  const [trail, setTrail] = useState<ImportedProjectIndexNode[]>([]);
  /** Definition the current file was opened at, if it was reached by a jump. */
  const [symbolLine, setSymbolLine] = useState<{ path: string; line: number } | null>(null);
  /** Right-clicked entry and where its menu sits, or null when it is closed. */
  const [menu, setMenu] = useState<{
    node: ImportedProjectIndexNode;
    x: number;
    y: number;
  } | null>(null);

  // The next click anywhere closes the menu, including the one on its own item.
  useEffect(() => {
    if (!menu) return;

    const close = () => setMenu(null);
    globalThis.addEventListener("click", close);

    return () => globalThis.removeEventListener("click", close);
  }, [menu]);

  const toggleFolder = (id: string) =>
    setOpenFolders((open) =>
      open.includes(id) ? open.filter((entry) => entry !== id) : [...open, id]
    );

  /** Shuts every folder at once, as the explorer pane's header does. */
  const collapseAll = () => setOpenFolders([]);

  const openMenu = (event: React.MouseEvent, node: ImportedProjectIndexNode) =>
    setMenu({ node, x: event.clientX, y: event.clientY });

  /** Opening a file from the tree or a search hit starts a fresh trail. */
  const openFile = (node: ImportedProjectIndexNode) => {
    setSelected(node);
    setTrail([]);
    setSymbolLine(null);
  };

  /**
   * Go to definition, the agents-page way: the reader here is a modal over the
   * terminal, not a workbench, so the jump lands in that same modal and the
   * file it came from goes on a trail the header can walk back. The agent
   * session underneath is never navigated away from.
   */
  const handleOpenSymbol = async (symbol: string, position?: SymbolPosition) => {
    const hit = await globalThis.lazify
      // The open file is what a relative import path is relative to, and what
      // the clicked position is read in.
      .findSymbolDefinition(projectPath, symbol, selected?.absolutePath ?? null, position)
      .catch(() => null);

    if (!hit) return;

    // Normally the definition is a file the index already knows. A file added
    // since the last scan is still worth opening, so stand one in.
    const node: ImportedProjectIndexNode = findByAbsolutePath(tree, hit.absolutePath) ?? {
      id: `symbol-${hit.absolutePath}`,
      name: hit.relativePath.slice(hit.relativePath.lastIndexOf("/") + 1),
      type: "file",
      relativePath: hit.relativePath,
      absolutePath: hit.absolutePath,
      children: []
    };

    // Jumping to the file already open is only a move to its declaration.
    if (selected && node.absolutePath !== selected.absolutePath) {
      setTrail((current) => [...current, selected]);
    }

    setSelected(node);
    setSymbolLine({ path: node.absolutePath, line: hit.line });
  };

  const handleBack = () => {
    setTrail((current) => {
      const previous = current[current.length - 1];
      if (!previous) return current;

      setSelected(previous);
      setSymbolLine(null);

      return current.slice(0, -1);
    });
  };

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
        <MatchRow key={match.node.id} match={match} onOpen={openFile} onOpenMenu={openMenu} />
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
        onOpenMenu={openMenu}
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
          {/* Disabled rather than hidden when nothing is open: a control that
              comes and goes is harder to reach for than one that greys out. */}
          <IconButton
            icon="collapse"
            title={t(translation.ProjectTree.CollapseAll)}
            aria-label={t(translation.ProjectTree.CollapseAll)}
            onClick={collapseAll}
            disabled={openFolders.length === 0}
            className="text-text"
          />
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

      {/* Right-click on any entry: hand it to the OS file manager. */}
      <TreeContextMenu
        position={menu}
        onRevealInFinder={() => {
          if (menu) void globalThis.lazify.revealInFileManager(menu.node.absolutePath);
          setMenu(null);
        }}
      />

      <AgentFileModal
        file={selected}
        onSendToTerminal={onSendToTerminal}
        onOpenSymbol={(symbol, position) => void handleOpenSymbol(symbol, position)}
        focusLine={
          symbolLine && symbolLine.path === selected?.absolutePath ? symbolLine.line : null
        }
        onBack={trail.length > 0 ? handleBack : undefined}
        onClose={() => {
          setSelected(null);
          setTrail([]);
          setSymbolLine(null);
        }}
      />
    </aside>
  );
}
