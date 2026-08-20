import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import {
  heldRouteIds,
  requestsAt,
  type CollectionTarget,
  type OpenExample
} from "../custom-collection";
import type { CustomCollectionApi } from "../hooks/use-custom-collection";
import { useTreeDrag } from "../hooks/use-tree-drag";
import type { SavedRoute } from "../types";
import { CustomCollectionRow } from "./CustomCollectionRow";
import { RoutePickerModal } from "./RoutePickerModal";

interface CustomCollectionPaneProps {
  custom: CustomCollectionApi;
  routes: SavedRoute[];
  projectPath: string;
  openRequestId: string | null;
  onOpenRequest: (requestId: string) => void;
  openExample: OpenExample | null;
  onOpenExample: (requestId: string, exampleId: string) => void;
}

function targetName(custom: CustomCollectionApi, target: CollectionTarget | null) {
  const collection = custom.collections.find((entry) => entry.id === target?.collectionId);

  if (!collection) return "";
  if (!target?.folderId) return collection.name;

  return collection.folders.find((folder) => folder.id === target.folderId)?.name ?? collection.name;
}

export function CustomCollectionPane({
  custom,
  projectPath,
  routes,
  openRequestId,
  onOpenRequest,
  openExample,
  onOpenExample
}: Readonly<CustomCollectionPaneProps>) {
  const { t } = useTranslation();
  const [picking, setPicking] = useState<CollectionTarget | null>(null);
  const drag = useTreeDrag(custom.moveNode);

  const addCollection = () =>
    custom.addCollection(
      t(translation.ApiStudio.NewCollectionName, { number: custom.collections.length + 1 })
    );

  if (custom.collections.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
        <UiIcon name="folder-plus" className="h-7 w-7 text-muted/70" />
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-text">
            {t(translation.ApiStudio.NoCustomCollection)}
          </span>
          <p className="max-w-[15rem] text-[11px] leading-5 text-muted">
            {t(translation.ApiStudio.NoCustomCollectionDesc)}
          </p>
        </div>
        <button
          type="button"
          onClick={addCollection}
          className={clsx(
            "flex items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-1.5",
            "text-[11px] font-medium text-text transition-colors hover:border-accent/40"
          )}
        >
          <UiIcon name="plus" className="h-3.5 w-3.5" />
          {t(translation.ApiStudio.NewCollection)}
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ul className="flex flex-col gap-0.5">
        {custom.collections.map((collection) => (
          <CustomCollectionRow
            key={collection.id}
            collection={collection}
            drag={drag}
            expanded={custom.expanded}
            openRequestId={openRequestId}
            onToggle={custom.toggle}
            onRename={(name) => custom.renameCollection(collection.id, name)}
            onRemove={() => custom.removeCollection(collection.id)}
            onAddFolder={() =>
              custom.addFolder(
                collection.id,
                t(translation.ApiStudio.NewFolderName, { number: collection.folders.length + 1 })
              )
            }
            onRenameFolder={(folderId, name) =>
              custom.renameFolder(collection.id, folderId, name)
            }
            onRemoveFolder={(folderId) => custom.removeFolder(collection.id, folderId)}
            onPickRequests={(folderId) => setPicking({ collectionId: collection.id, folderId })}
            onExport={() =>
              void globalThis.lazify
                .exportCustomCollection(projectPath, collection.id, collection.name)
                .catch(() => null)
            }
            onOpenRequest={onOpenRequest}
            openExample={openExample}
            onOpenExample={onOpenExample}
            onRemoveExample={custom.removeExample}
            onRenameRequest={custom.renameRequest}
            onRemoveRequest={custom.removeRequest}
          />
        ))}
      </ul>

      <button
        type="button"
        onClick={addCollection}
        className={clsx(
          "mt-2 flex items-center gap-1.5 self-start rounded-md px-1 py-1",
          "text-[11px] font-medium text-muted transition-colors hover:text-text"
        )}
      >
        <UiIcon name="plus" className="h-3.5 w-3.5" />
        {t(translation.ApiStudio.NewCollection)}
      </button>

      <RoutePickerModal
        open={Boolean(picking)}
        targetName={targetName(custom, picking)}
        routes={routes}
        heldRouteIds={heldRouteIds(picking ? requestsAt(custom.collections, picking) : [])}
        onAdd={(picked) => {
          if (picking) void custom.addRequests(picking, picked);
          setPicking(null);
        }}
        onClose={() => setPicking(null)}
      />
    </div>
  );
}
