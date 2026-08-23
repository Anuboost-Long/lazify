import clsx from "clsx";
import { useTranslation } from "react-i18next";

import type { CollectionDoc, DocGap } from "@main/api-studio/docs/types";
import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { requestsOf, type CustomCollection } from "../../custom-collection";
import { sameSelection, type DocSelection } from "../../doc-selection";
import { MethodBadge } from "../MethodBadge";

interface DocOutlineProps {
  doc: CollectionDoc;
  gaps: DocGap[];
  collection: CustomCollection;
  selected: DocSelection;
  onSelect: (selection: DocSelection) => void;
}

function GapCount({ count }: Readonly<{ count: number }>) {
  if (count === 0) return null;

  return (
    <span
      className={clsx(
        "shrink-0 rounded-full border border-warning/40 bg-warning/10 px-1.5",
        "text-[10px] font-semibold text-warning"
      )}
    >
      {count}
    </span>
  );
}

export function DocOutline({ doc, gaps, collection, selected, onSelect }: Readonly<DocOutlineProps>) {
  const { t } = useTranslation();
  const requests = new Map(requestsOf(collection).map((request) => [request.id, request]));
  const countOf = (selection: DocSelection) =>
    gaps.filter((gap) => {
      if (selection.kind === "request") return gap.requestId === selection.id;
      if (selection.kind === "folder") return gap.folderId === selection.id;

      return gap.requestId === null && !gap.folderId;
    }).length;
  const groups = doc.routes.reduce<Array<{ id: string; name: string; entries: typeof doc.routes }>>(
    (held, entry) => {
      const group = held.find((one) => one.id === entry.folderId);

      if (group) group.entries.push(entry);
      else held.push({ id: entry.folderId, name: entry.folder, entries: [entry] });

      return held;
    },
    []
  );
  const rowClass = (active: boolean) =>
    clsx(
      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
      active ? "bg-accent/10 text-text" : "text-muted hover:bg-text/[0.04] hover:text-text"
    );

  return (
    <nav className="flex min-h-0 w-full flex-col gap-1 overflow-y-auto p-3">
      <button
        type="button"
        onClick={() => onSelect({ kind: "document" })}
        className={rowClass(selected.kind === "document")}
      >
        <UiIcon name="journal-page" className="h-3.5 w-3.5 shrink-0 text-accent/80" />
        <span className="min-w-0 flex-1 truncate text-xs font-semibold">
          {t(translation.ApiStudio.DocDocument)}
        </span>
        <GapCount count={countOf({ kind: "document" })} />
      </button>

      {groups.map((group) => (
        <div key={group.id || "loose"} className="flex flex-col gap-1">
          {group.id ? (
            <button
              type="button"
              onClick={() => onSelect({ kind: "folder", id: group.id })}
              className={clsx(rowClass(sameSelection(selected, { kind: "folder", id: group.id })), "mt-2")}
            >
              <UiIcon name="folder" className="h-3.5 w-3.5 shrink-0 text-muted" />
              <span className="min-w-0 flex-1 truncate text-xs font-semibold">{group.name}</span>
              <GapCount count={countOf({ kind: "folder", id: group.id })} />
            </button>
          ) : (
            <span className="mt-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
              {t(translation.ApiStudio.Routes)}
            </span>
          )}

          {group.entries.map((entry) => {
            const request = requests.get(entry.requestId);

            if (!request) return null;

            return (
              <button
                key={entry.requestId}
                type="button"
                onClick={() => onSelect({ kind: "request", id: entry.requestId })}
                className={clsx(
                  rowClass(sameSelection(selected, { kind: "request", id: entry.requestId })),
                  group.id && "pl-4"
                )}
              >
                <MethodBadge method={request.route.method} />
                <span className="min-w-0 flex-1 truncate text-xs">
                  {entry.title || request.route.path}
                </span>
                <GapCount count={countOf({ kind: "request", id: entry.requestId })} />
              </button>
            );
          })}
        </div>
      ))}

      {doc.routes.length === 0 ? (
        <p className="px-2 py-4 text-[11px] leading-5 text-muted">
          {t(translation.ApiStudio.DocNoRoutes)}
        </p>
      ) : null}
    </nav>
  );
}
