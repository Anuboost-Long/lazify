import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { requestsOf, type CustomCollection, type OpenExample } from "../custom-collection";
import type { TreeDrag } from "../hooks/use-tree-drag";
import { CustomFolderRow } from "./CustomFolderRow";
import { CustomRequestRow } from "./CustomRequestRow";
import { InlineRename } from "./InlineRename";
import { RowMenuButton, useRowMenu } from "./RowMenuButton";

interface CustomCollectionRowProps {
  collection: CustomCollection;
  drag: TreeDrag;
  expanded: ReadonlySet<string>;
  openRequestId: string | null;
  onToggle: (nodeId: string) => void;
  onRename: (name: string) => void;
  onRemove: () => void;
  onAddFolder: () => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onRemoveFolder: (folderId: string) => void;
  onPickRequests: (folderId: string | null) => void;
  onExport: () => void;
  onOpenRequest: (requestId: string) => void;
  openExample: OpenExample | null;
  onOpenExample: (requestId: string, exampleId: string) => void;
  onRemoveExample: (requestId: string, exampleId: string) => void;
  onRenameRequest: (requestId: string, name: string) => void;
  onRemoveRequest: (requestId: string) => void;
}

export function CustomCollectionRow({
  collection,
  drag,
  expanded,
  openRequestId,
  onToggle,
  onRename,
  onRemove,
  onAddFolder,
  onRenameFolder,
  onRemoveFolder,
  onPickRequests,
  onExport,
  onOpenRequest,
  openExample,
  onOpenExample,
  onRemoveExample,
  onRenameRequest,
  onRemoveRequest
}: Readonly<CustomCollectionRowProps>) {
  const { t } = useTranslation();
  const [renaming, setRenaming] = useState(false);
  const [menuAt, setMenuAt] = useRowMenu();
  const shut = !expanded.has(collection.id);
  const menuItems = [
    {
      key: "add",
      label: t(translation.ApiStudio.PickRequests),
      onSelect: () => onPickRequests(null)
    },
    { key: "folder", label: t(translation.ApiStudio.NewFolder), onSelect: onAddFolder },
    {
      key: "rename",
      label: t(translation.ApiStudio.RenameCollection),
      onSelect: () => setRenaming(true)
    },
    { key: "export", label: t(translation.ApiStudio.ExportCollection), onSelect: onExport },
    {
      key: "remove",
      label: t(translation.ApiStudio.RemoveCollection),
      destructive: true,
      onSelect: onRemove
    }
  ];
  const total = requestsOf(collection).length;
  const empty = total === 0 && collection.folders.length === 0;

  return (
    <li className="flex flex-col">
      <div
        {...drag.propsFor({ kind: "collection", id: collection.id })}
        onContextMenu={(event) => {
          event.preventDefault();
          setMenuAt({ x: event.clientX, y: event.clientY });
        }}
        className={clsx(
          "group relative flex items-center gap-1 rounded-md px-1 py-1 hover:bg-text/[0.03]",
          drag.draggingId === collection.id && "opacity-40",
          drag.overId === collection.id && "before:absolute before:inset-x-0 before:-top-px before:h-0.5 before:rounded-full before:bg-accent"
        )}
      >
        <button
          type="button"
          onClick={() => onToggle(collection.id)}
          aria-expanded={!shut}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <UiIcon
            name="arrow-right"
            className={clsx(
              "h-3 w-3 shrink-0 text-muted transition-transform",
              shut ? null : "rotate-90"
            )}
          />
          <UiIcon name="journal-page" className="h-3.5 w-3.5 shrink-0 text-accent/80" />
          {renaming ? null : (
            <span className="truncate text-xs font-semibold text-text">{collection.name}</span>
          )}
          {renaming || total === 0 ? null : (
            <span className="shrink-0 text-[10px] text-muted">{total}</span>
          )}
        </button>

        {renaming ? (
          <InlineRename
            value={collection.name}
            label={t(translation.ApiStudio.CollectionName)}
            onCommit={(name) => {
              onRename(name);
              setRenaming(false);
            }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <RowMenuButton
            label={collection.name}
            items={menuItems}
            openAt={menuAt}
            onOpenAtChange={setMenuAt}
          />
        )}
      </div>

      {shut ? null : (
        <ul className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-border pl-2.5">
          {collection.folders.map((folder) => (
            <CustomFolderRow
              key={folder.id}
              folder={folder}
              drag={drag}
              collapsed={!expanded.has(folder.id)}
              expandedRequests={expanded}
              openRequestId={openRequestId}
              onToggle={() => onToggle(folder.id)}
              onToggleRequest={onToggle}
              onRename={(name) => onRenameFolder(folder.id, name)}
              onRemove={() => onRemoveFolder(folder.id)}
              onPickRequests={() => onPickRequests(folder.id)}
              onOpenRequest={onOpenRequest}
              openExample={openExample}
              onOpenExample={onOpenExample}
              onRemoveExample={onRemoveExample}
              onRenameRequest={onRenameRequest}
              onRemoveRequest={onRemoveRequest}
            />
          ))}

          {collection.requests.map((request) => (
            <CustomRequestRow
              key={request.id}
              request={request}
              drag={drag}
              open={request.id === openRequestId}
              collapsed={!expanded.has(request.id)}
              onOpen={() => onOpenRequest(request.id)}
              onToggle={() => onToggle(request.id)}
              openExample={openExample}
              onOpenExample={(exampleId) => onOpenExample(request.id, exampleId)}
              onRemoveExample={(exampleId) => onRemoveExample(request.id, exampleId)}
              onRename={(name) => onRenameRequest(request.id, name)}
              onRemove={() => onRemoveRequest(request.id)}
            />
          ))}

          {empty ? (
            <li>
              <button
                type="button"
                onClick={() => onPickRequests(null)}
                className={clsx(
                  "flex items-center gap-1.5 rounded-md px-1 py-1.5",
                  "text-[11px] text-muted transition-colors hover:text-text"
                )}
              >
                <UiIcon name="plus" className="h-3.5 w-3.5" />
                {t(translation.ApiStudio.EmptyCollection)}
              </button>
            </li>
          ) : null}
        </ul>
      )}
    </li>
  );
}
