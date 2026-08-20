import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { CustomFolder, OpenExample } from "../custom-collection";
import type { TreeDrag } from "../hooks/use-tree-drag";
import { CustomRequestRow } from "./CustomRequestRow";
import { InlineRename } from "./InlineRename";
import { RowMenuButton, useRowMenu } from "./RowMenuButton";

interface CustomFolderRowProps {
  folder: CustomFolder;
  drag: TreeDrag;
  collapsed: boolean;
  expandedRequests: ReadonlySet<string>;
  openRequestId: string | null;
  onToggle: () => void;
  onToggleRequest: (requestId: string) => void;
  onRename: (name: string) => void;
  onRemove: () => void;
  onPickRequests: () => void;
  onOpenRequest: (requestId: string) => void;
  openExample: OpenExample | null;
  onOpenExample: (requestId: string, exampleId: string) => void;
  onRemoveExample: (requestId: string, exampleId: string) => void;
  onRenameRequest: (requestId: string, name: string) => void;
  onRemoveRequest: (requestId: string) => void;
}

export function CustomFolderRow({
  folder,
  drag,
  collapsed,
  expandedRequests,
  openRequestId,
  onToggle,
  onToggleRequest,
  onRename,
  onRemove,
  onPickRequests,
  onOpenRequest,
  openExample,
  onOpenExample,
  onRemoveExample,
  onRenameRequest,
  onRemoveRequest
}: Readonly<CustomFolderRowProps>) {
  const { t } = useTranslation();
  const [renaming, setRenaming] = useState(false);
  const [menuAt, setMenuAt] = useRowMenu();
  const menuItems = [
    { key: "add", label: t(translation.ApiStudio.PickRequests), onSelect: onPickRequests },
    {
      key: "rename",
      label: t(translation.ApiStudio.RenameFolder),
      onSelect: () => setRenaming(true)
    },
    {
      key: "remove",
      label: t(translation.ApiStudio.RemoveFolder),
      destructive: true,
      onSelect: onRemove
    }
  ];

  return (
    <li className="flex flex-col">
      <div
        {...drag.propsFor({ kind: "folder", id: folder.id })}
        onContextMenu={(event) => {
          event.preventDefault();
          setMenuAt({ x: event.clientX, y: event.clientY });
        }}
        className={clsx(
          "group relative flex items-center gap-1 rounded-md px-1 py-1 hover:bg-text/[0.03]",
          drag.draggingId === folder.id && "opacity-40",
          drag.overId === folder.id && "before:absolute before:inset-x-0 before:-top-px before:h-0.5 before:rounded-full before:bg-accent"
        )}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <UiIcon
            name="arrow-right"
            className={clsx(
              "h-3 w-3 shrink-0 text-muted transition-transform",
              collapsed ? null : "rotate-90"
            )}
          />
          <UiIcon name="folder" className="h-3.5 w-3.5 shrink-0 text-muted" />
          {renaming ? null : (
            <span className="truncate text-xs font-medium text-text">{folder.name}</span>
          )}
          {renaming || folder.requests.length === 0 ? null : (
            <span className="shrink-0 text-[10px] text-muted">{folder.requests.length}</span>
          )}
        </button>

        {renaming ? (
          <InlineRename
            value={folder.name}
            label={t(translation.ApiStudio.FolderName)}
            onCommit={(name) => {
              onRename(name);
              setRenaming(false);
            }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <RowMenuButton
            label={folder.name}
            items={menuItems}
            openAt={menuAt}
            onOpenAtChange={setMenuAt}
          />
        )}
      </div>

      {collapsed ? null : (
        <ul className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-border pl-2.5">
          {folder.requests.length === 0 ? (
            <li>
              <button
                type="button"
                onClick={onPickRequests}
                className={clsx(
                  "flex items-center gap-1.5 rounded-md px-1 py-1.5",
                  "text-[11px] text-muted transition-colors hover:text-text"
                )}
              >
                <UiIcon name="plus" className="h-3.5 w-3.5" />
                {t(translation.ApiStudio.EmptyFolder)}
              </button>
            </li>
          ) : (
            folder.requests.map((request) => (
              <CustomRequestRow
                key={request.id}
                request={request}
                drag={drag}
                open={request.id === openRequestId}
                collapsed={!expandedRequests.has(request.id)}
                onOpen={() => onOpenRequest(request.id)}
                onToggle={() => onToggleRequest(request.id)}
                openExample={openExample}
                onOpenExample={(exampleId) => onOpenExample(request.id, exampleId)}
                onRemoveExample={(exampleId) => onRemoveExample(request.id, exampleId)}
                onRename={(name) => onRenameRequest(request.id, name)}
                onRemove={() => onRemoveRequest(request.id)}
              />
            ))
          )}
        </ul>
      )}
    </li>
  );
}
