import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { SavedExample } from "../types";
import { RowMenuButton, useRowMenu } from "./RowMenuButton";

interface ExampleRowProps {
  example: SavedExample;
  open: boolean;
  onOpen: () => void;
  onRemove: () => void;
}

export function ExampleRow({ example, open, onOpen, onRemove }: Readonly<ExampleRowProps>) {
  const { t } = useTranslation();
  const [menuAt, setMenuAt] = useRowMenu();

  return (
    <li
      onContextMenu={(event) => {
        event.preventDefault();
        setMenuAt({ x: event.clientX, y: event.clientY });
      }}
      className={clsx(
        "group/example flex items-center gap-1 rounded-md px-1 py-1",
        open ? "bg-accent/[0.08]" : "hover:bg-text/[0.03]"
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
      >
        <UiIcon name="journal-page" className="h-3 w-3 shrink-0 text-muted" />
        <span className={clsx("truncate text-[11px]", open ? "text-accent" : "text-muted")}>
          {example.name}
        </span>
      </button>

      <RowMenuButton
        label={example.name}
        openAt={menuAt}
        onOpenAtChange={setMenuAt}
        items={[
          {
            key: "remove",
            label: t(translation.ApiStudio.RemoveExample),
            destructive: true,
            onSelect: onRemove
          }
        ]}
      />
    </li>
  );
}
