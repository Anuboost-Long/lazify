import clsx from "clsx";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { TreeNode } from "@renderer/shared/ui/project-tree/types";

function getFileIconName(name: string) {
  const extension = name.includes(".") ? name.split(".").pop()?.toLowerCase() ?? "" : "";

  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp", "avif"].includes(extension)) {
    return "media-image";
  }

  if (["mp4", "mov", "webm", "avi", "mkv"].includes(extension)) {
    return "media-video";
  }

  if (["json", "yml", "yaml", "toml", "env", "ini", "lock"].includes(extension) || name === "package.json") {
    return "database";
  }

  if (["ts", "tsx", "js", "jsx", "mjs", "cjs", "sh", "bash"].includes(extension)) {
    return "code";
  }

  if (["css", "scss", "sass", "less"].includes(extension)) {
    return "css";
  }

  if (["html", "htm"].includes(extension)) {
    return "html";
  }

  if (["md", "mdx", "txt"].includes(extension)) {
    return "journal-page";
  }

  if (!extension) {
    return "empty-page";
  }

  return "page";
}

interface ExplorerNodeProps {
  node: TreeNode;
  depth: number;
  expandedIds: string[];
  selectedId: string | null;
  renamingId: string | null;
  renameValue: string;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onOpenContextMenu: (event: React.MouseEvent<HTMLButtonElement>, node: TreeNode) => void;
  onRenameValueChange: (value: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
}

export function ExplorerNode({
  node,
  depth,
  expandedIds,
  selectedId,
  renamingId,
  renameValue,
  onSelect,
  onToggleExpand,
  onOpenContextMenu,
  onRenameValueChange,
  onCommitRename,
  onCancelRename
}: ExplorerNodeProps) {
  const expanded = expandedIds.includes(node.id);
  const selected = selectedId === node.id;
  const hasChildren = node.type === "folder" && node.children.length > 0;
  const isRenaming = renamingId === node.id;

  return (
    <div>
      <div
        onContextMenu={(event) => onOpenContextMenu(event, node)}
        className={clsx(
          "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition",
          selected ? "bg-cyan-400/15 text-cyan-50" : "text-slate-100 hover:bg-white/[0.05]"
        )}
        style={{ paddingLeft: `${12 + depth * 18}px` }}
      >
        <button
          type="button"
          onClick={() => {
            onSelect(node.id);
            if (node.type === "folder") {
              onToggleExpand(node.id);
            }
          }}
          className="contents"
        >
          <span className="w-3 text-center text-[10px] text-[#7ca6bb]">
            {node.type === "folder" ? (expanded ? "▾" : hasChildren ? "▸" : "•") : "•"}
          </span>
          <UiIcon
            name={node.type === "folder" ? "folder" : getFileIconName(node.name)}
            className={clsx(
              "h-4 w-4 shrink-0",
              node.type === "folder"
                ? node.source === "cli"
                  ? "text-emerald-300"
                  : node.source === "module"
                    ? "text-cyan-300"
                    : "text-amber-300"
                : ["json", "yml", "yaml", "toml", "env", "ini", "lock"].includes(
                      node.name.includes(".") ? node.name.split(".").pop()?.toLowerCase() ?? "" : ""
                    ) || node.name === "package.json"
                  ? "text-emerald-300"
                  : ["css", "scss", "sass", "less"].includes(
                        node.name.includes(".") ? node.name.split(".").pop()?.toLowerCase() ?? "" : ""
                      )
                    ? "text-sky-300"
                    : ["html", "htm"].includes(
                          node.name.includes(".") ? node.name.split(".").pop()?.toLowerCase() ?? "" : ""
                        )
                      ? "text-orange-300"
                      : ["png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp", "avif"].includes(
                            node.name.includes(".") ? node.name.split(".").pop()?.toLowerCase() ?? "" : ""
                          )
                        ? "text-pink-300"
                        : ["mp4", "mov", "webm", "avi", "mkv"].includes(
                              node.name.includes(".") ? node.name.split(".").pop()?.toLowerCase() ?? "" : ""
                            )
                          ? "text-violet-300"
                          : ["md", "mdx", "txt"].includes(
                                node.name.includes(".") ? node.name.split(".").pop()?.toLowerCase() ?? "" : ""
                              )
                            ? "text-cyan-200"
                            : "text-[#ffcf66]"
            )}
          />
        </button>
        {isRenaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(event) => onRenameValueChange(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onBlur={onCommitRename}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onCommitRename();
              }

              if (event.key === "Escape") {
                event.preventDefault();
                onCancelRename();
              }
            }}
            className="min-w-0 flex-1 rounded-md border border-cyan-300/30 bg-black/30 px-2 py-1 font-mono text-sm text-slate-50 outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              onSelect(node.id);
              if (node.type === "folder") {
                onToggleExpand(node.id);
              }
            }}
            className="min-w-0 flex-1 truncate font-mono text-left text-sm"
          >
            {node.name}
          </button>
        )}
        <span
          className={clsx(
            "ml-auto rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
            node.source === "cli"
              ? "border border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
              : node.source === "module"
                ? "border border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
                : "border border-amber-300/20 bg-amber-300/10 text-amber-100"
          )}
        >
          {node.source}
        </span>
      </div>

      {node.type === "folder" && expanded
        ? node.children.map((child) => (
            <ExplorerNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              selectedId={selectedId}
              renamingId={renamingId}
              renameValue={renameValue}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onOpenContextMenu={onOpenContextMenu}
              onRenameValueChange={onRenameValueChange}
              onCommitRename={onCommitRename}
              onCancelRename={onCancelRename}
            />
          ))
        : null}
    </div>
  );
}
