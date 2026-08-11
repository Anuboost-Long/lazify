import clsx from "clsx";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { ImportedProjectIndexNode } from "@renderer/shared/types/lazify";
import { SmallText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { SymbolPosition } from "@renderer/shared/ui/code/symbol-at-point";
import { TreeContextMenu } from "@renderer/shared/ui/project-tree/TreeContextMenu";
import { useAgentFiles } from "../../hooks/use-agent-files";
import { AgentFileModal } from "../AgentFileModal";
import { railPanelShell, type RailPanelVariant } from "../rail-panel-shell";
import { findByAbsolutePath, MatchRow, PanelMessage, TreeRow } from "./FileTreeRows";

interface AgentFilesPanelProps {
  projectPath: string;

  onSendToTerminal: ((text: string) => void) | null;
  onClose: () => void;

  variant?: RailPanelVariant;
}

export function AgentFilesPanel({
  projectPath,
  onSendToTerminal,
  onClose,
  variant = "rail"
}: Readonly<AgentFilesPanelProps>) {
  const { t } = useTranslation();
  const { tree, loading, query, setQuery, matches, searching, refresh } = useAgentFiles(
    projectPath,
    true
  );
  const [openFolders, setOpenFolders] = useState<string[]>([]);
  const [selected, setSelected] = useState<ImportedProjectIndexNode | null>(null);

  const [trail, setTrail] = useState<ImportedProjectIndexNode[]>([]);

  const [symbolLine, setSymbolLine] = useState<{ path: string; line: number } | null>(null);

  const [menu, setMenu] = useState<{
    node: ImportedProjectIndexNode;
    x: number;
    y: number;
  } | null>(null);

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

  const collapseAll = () => setOpenFolders([]);

  const openMenu = (event: React.MouseEvent, node: ImportedProjectIndexNode) =>
    setMenu({ node, x: event.clientX, y: event.clientY });

  const openFile = (node: ImportedProjectIndexNode) => {
    setSelected(node);
    setTrail([]);
    setSymbolLine(null);
  };

  const handleOpenSymbol = async (symbol: string, position?: SymbolPosition) => {
    const hit = await globalThis.lazify

      .findSymbolDefinition(projectPath, symbol, selected?.absolutePath ?? null, position)
      .catch(() => null);

    if (!hit) return;

    const node: ImportedProjectIndexNode = findByAbsolutePath(tree, hit.absolutePath) ?? {
      id: `symbol-${hit.absolutePath}`,
      name: hit.relativePath.slice(hit.relativePath.lastIndexOf("/") + 1),
      type: "file",
      relativePath: hit.relativePath,
      absolutePath: hit.absolutePath,
      children: []
    };

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
    <aside className={railPanelShell(variant)}>
      <header className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        <UiIcon name="folder" className="ml-1 h-3.5 w-3.5 text-muted" />
        <SmallText as="span" className="!text-text truncate">
          {t(translation.Agents.Files)}
        </SmallText>

        <div className="ml-auto flex items-center">

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

