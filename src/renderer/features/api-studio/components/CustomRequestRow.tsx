import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { CustomRequest, OpenExample } from "../custom-collection";
import type { TreeDrag } from "../hooks/use-tree-drag";
import { ExampleRow } from "./ExampleRow";
import { InlineRename } from "./InlineRename";
import { MethodBadge } from "./MethodBadge";
import { RowMenuButton, useRowMenu } from "./RowMenuButton";

interface CustomRequestRowProps {
  request: CustomRequest;
  drag: TreeDrag;
  open: boolean;
  collapsed: boolean;
  onOpen: () => void;
  onToggle: () => void;
  openExample: OpenExample | null;
  onOpenExample: (exampleId: string) => void;
  onRemoveExample: (exampleId: string) => void;
  onRename: (name: string) => void;
  onRemove: () => void;
}

export function CustomRequestRow({
  request,
  drag,
  open,
  collapsed,
  onOpen,
  onToggle,
  openExample,
  onOpenExample,
  onRemoveExample,
  onRename,
  onRemove
}: Readonly<CustomRequestRowProps>) {
  const { t } = useTranslation();
  const [renaming, setRenaming] = useState(false);
  const [menuAt, setMenuAt] = useRowMenu();
  const hasExamples = request.examples.length > 0;
  const menuItems = [
    {
      key: "rename",
      label: t(translation.ApiStudio.RenameRequest),
      onSelect: () => setRenaming(true)
    },
    {
      key: "remove",
      label: t(translation.ApiStudio.RemoveRequest),
      destructive: true,
      onSelect: onRemove
    }
  ];

  return (
    <li className="flex flex-col">
      <div
        {...drag.propsFor({ kind: "request", id: request.id })}
        onContextMenu={(event) => {
          event.preventDefault();
          setMenuAt({ x: event.clientX, y: event.clientY });
        }}
        className={clsx(
          "group/request relative flex items-center gap-1 rounded-md px-1 py-1",
          open ? "bg-accent/[0.08]" : "hover:bg-text/[0.03]",
          drag.draggingId === request.id && "opacity-40",
          drag.overId === request.id && "before:absolute before:inset-x-0 before:-top-px before:h-0.5 before:rounded-full before:bg-accent"
        )}
      >
        {hasExamples ? (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!collapsed}
            aria-label={t(translation.ApiStudio.Examples)}
            className="flex h-4 w-3 shrink-0 items-center justify-center"
          >
            <UiIcon
              name="arrow-right"
              className={clsx(
                "h-3 w-3 text-muted transition-transform",
                collapsed ? null : "rotate-90"
              )}
            />
          </button>
        ) : (
          <span className="w-3 shrink-0" />
        )}

        <button
          type="button"
          onClick={onOpen}
          title={request.route.path}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <MethodBadge method={request.route.method} />
          {renaming ? null : (
            <span className={clsx("truncate text-[11px]", open ? "text-accent" : "text-text")}>
              {request.name}
            </span>
          )}
        </button>

        {renaming ? (
          <InlineRename
            value={request.name}
            label={t(translation.ApiStudio.RequestName)}
            onCommit={(name) => {
              onRename(name);
              setRenaming(false);
            }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <RowMenuButton
            label={request.name}
            items={menuItems}
            openAt={menuAt}
            onOpenAtChange={setMenuAt}
          />
        )}
      </div>

      {hasExamples && !collapsed ? (
        <ul className="ml-6 mt-1 flex flex-col gap-0.5 border-l border-border pl-2.5">
          {request.examples.map((example) => (
            <ExampleRow
              key={example.id}
              example={example}
              open={openExample?.ownerId === request.id && openExample.id === example.id}
              onOpen={() => onOpenExample(example.id)}
              onRemove={() => onRemoveExample(example.id)}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
