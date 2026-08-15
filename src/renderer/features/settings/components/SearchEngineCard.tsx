import clsx from "clsx";
import { useTranslation } from "react-i18next";

import type { SearchEngine } from "@renderer/shared/lib/search-engines";
import { CardTitle, SmallText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface SearchEngineCardProps {
  engine: SearchEngine;
  selected: boolean;
  onSelect: () => void;
}

export function SearchEngineCard({ engine, selected, onSelect }: Readonly<SearchEngineCardProps>) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={clsx(
        "relative flex flex-1 flex-col items-start gap-3 rounded-2xl border p-5 text-left",
        "transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.99]",
        selected
          ? "border-accent bg-accent/[0.06]"
          : "border-border bg-soft hover:border-accent/40"
      )}
    >
      {selected ? (
        <UiIcon name="check-circle" filled className="absolute right-4 top-4 h-4 w-4 text-accent" />
      ) : null}

      <span
        className={clsx(
          "flex h-12 w-12 items-center justify-center rounded-2xl",
          "text-xl font-semibold",
          engine.markClassName
        )}
      >
        {engine.mark}
      </span>

      <div>
        <CardTitle className="!text-text">{engine.name}</CardTitle>
        <SmallText className="!text-muted mt-1 block leading-5">
          {t(engine.descriptionKey)}
        </SmallText>
      </div>
    </button>
  );
}
