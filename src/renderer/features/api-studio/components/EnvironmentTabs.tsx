import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { ApiEnvironment } from "../types";

interface EnvironmentTabsProps {
  environments: ApiEnvironment[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDuplicate: () => void;
  onRemove: (id: string) => void;
}

export function EnvironmentTabs({
  environments,
  activeId,
  onSelect,
  onAdd,
  onDuplicate,
  onRemove
}: Readonly<EnvironmentTabsProps>) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {environments.map((environment) => (
        <button
          key={environment.id}
          type="button"
          onClick={() => onSelect(environment.id)}
          className={clsx(
            "h-7 rounded-lg px-2.5 text-xs font-medium transition-colors",
            environment.id === activeId
              ? "bg-accent/10 text-accent"
              : "text-muted hover:bg-text/[0.04] hover:text-text"
          )}
        >
          {environment.name}
        </button>
      ))}

      <button
        type="button"
        onClick={onAdd}
        title={t(translation.ApiStudio.AddEnvironment)}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:text-accent"
      >
        <UiIcon name="plus" className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        onClick={onDuplicate}
        title={t(translation.ApiStudio.DuplicateEnvironment)}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:text-accent"
      >
        <UiIcon name="multi-window" className="h-3.5 w-3.5" />
      </button>

      {environments.length > 1 ? (
        <button
          type="button"
          onClick={() => onRemove(activeId)}
          title={t(translation.ApiStudio.DeleteEnvironment)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:text-error"
        >
          <UiIcon name="trash" className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
