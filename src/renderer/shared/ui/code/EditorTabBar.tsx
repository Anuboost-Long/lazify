import clsx from "clsx";

import { Tooltip } from "@renderer/shared/ui/Tooltip";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { MonoText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { getFileVisual } from "@renderer/shared/ui/project-tree-optimized/tree-utils-editable";

/**
 * Open-file tabs for the editor pane.
 *
 * Drag-to-reorder follows the same mechanics as the agent terminal tabs: an
 * insertion line on the edge the tab would arrive from, and the drop handler
 * asks the owner to move one tab to another's position. Unlike those, closing
 * a tab here costs nothing, so there is no confirmation.
 */

export interface EditorTab {
  /** Tab identity. A file and its diff are two tabs, so this is prefixed. */
  path: string;
  name: string;
  kind: "file" | "diff";
  /** The file on disk this tab is about. */
  filePath: string;
}

interface EditorTabBarProps {
  tabs: EditorTab[];
  activePath: string | null;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
  /** Moves the dragged tab to the target tab's position. */
  onReorder: (fromPath: string, toPath: string) => void;
}

export function EditorTabBar({
  tabs,
  activePath,
  onSelect,
  onClose,
  onReorder
}: Readonly<EditorTabBarProps>) {
  const { t } = useTranslation();
  const [draggingPath, setDraggingPath] = useState<string | null>(null);
  const [dropTargetPath, setDropTargetPath] = useState<string | null>(null);

  const endDrag = () => {
    setDraggingPath(null);
    setDropTargetPath(null);
  };

  if (tabs.length === 0) return null;

  return (
    // Tabs keep their natural width and the strip scrolls once they outrun it;
    // it never grows the header, and never trades height for a scrollbar.
    <div className="flex h-full w-0 min-w-0 flex-1 items-stretch overflow-x-auto overflow-y-hidden">
      {tabs.map((tab, index) => {
        const isActive = tab.path === activePath;
        const isDragging = tab.path === draggingPath;
        const isDropTarget = tab.path === dropTargetPath && !isDragging;
        const draggingIndex = tabs.findIndex(
          (candidate) => candidate.path === draggingPath
        );
        // The insertion line sits on the edge the tab would arrive from.
        const dropsAfter = draggingIndex !== -1 && draggingIndex < index;
        const visual = getFileVisual(tab.name);

        return (
          <div
            key={tab.path}
            draggable
            onDragStart={(event) => {
              setDraggingPath(tab.path);
              event.dataTransfer.effectAllowed = "move";
              // Firefox refuses to start a drag without payload.
              event.dataTransfer.setData("text/plain", tab.path);
            }}
            onDragOver={(event) => {
              if (!draggingPath) return;
              // Preventing the default is what marks this a valid drop target.
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setDropTargetPath(tab.path);
            }}
            onDragLeave={() => {
              setDropTargetPath((current) =>
                current === tab.path ? null : current
              );
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (draggingPath) onReorder(draggingPath, tab.path);
              endDrag();
            }}
            onDragEnd={endDrag}
            className={clsx(
              // Full-height rectangles divided by a seam, so the whole tab is
              // the hit target rather than a small pill floating in padding.
              "group relative flex h-full shrink-0 select-none items-center gap-2",
              "border-r border-border pl-3 pr-2",
              "cursor-grab transition-colors active:cursor-grabbing",
              isActive ? "bg-bg" : "bg-soft hover:bg-bg/50",
              isDragging && "opacity-40"
            )}
          >
            {/* Accent rule along the top edge marks the active tab. */}
            {isActive ? (
              <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-accent" />
            ) : null}

            {isDropTarget ? (
              <span
                aria-hidden
                className={clsx(
                  "absolute inset-y-0 z-10 w-0.5 bg-accent",
                  dropsAfter ? "right-0" : "left-0"
                )}
              />
            ) : null}

            <Tooltip content={tab.path} side="bottom">
              <button
                type="button"
                onClick={() => onSelect(tab.path)}
                className="flex h-full min-w-0 items-center gap-2"
              >
                <UiIcon
                  name={tab.kind === "diff" ? "journal-page" : visual.icon}
                  className={clsx("h-4 w-4 shrink-0", tab.kind === "diff" ? "text-warning" : visual.color)}
                />
                <MonoText
                  as="span"
                  className={clsx(
                    "max-w-[14rem] truncate text-xs",
                    isActive ? "text-accent" : "text-muted"
                  )}
                >
                  {tab.name}
                </MonoText>
                {tab.kind === "diff" ? (
                  <MonoText as="span" className="shrink-0 text-[10px] uppercase text-muted">
                    diff
                  </MonoText>
                ) : null}
              </button>
            </Tooltip>

            <Tooltip content={t(translation.GlobalTerm.Close)} side="bottom">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onClose(tab.path);
                }}
                aria-label={t(translation.GlobalTerm.Close)}
                className={clsx(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors",
                  "text-muted hover:bg-text/10 hover:text-text",
                  // Always reachable on the active tab; on tap-only devices the
                  // hover reveal never fires, so keep it visible there too.
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                )}
              >
                <UiIcon name="xmark" className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          </div>
        );
      })}
    </div>
  );
}
