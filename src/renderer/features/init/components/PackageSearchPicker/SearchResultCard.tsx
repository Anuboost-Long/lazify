import clsx from "clsx";
import { CardTitle, BodyText, PillText } from "@renderer/shared/typography";
import { useTranslation } from "react-i18next";
import { translation } from "@renderer/i18n/translation";
import type { PackageOption } from "@renderer/shared/types/lazify";

interface SearchResultCardProps {
  pkg: PackageOption;
  selected: boolean;
  busy: boolean;
  onAdd: (pkg: PackageOption) => void;
}

export function SearchResultCard({ pkg, selected, busy, onAdd }: SearchResultCardProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={() => onAdd(pkg)}
      disabled={busy || selected}
      className={clsx(
        "group w-full rounded-[18px] border px-4 py-3 text-left",
        "transition-[transform,box-shadow,border-color] duration-300",
        "enabled:hover:-translate-y-1 enabled:hover:shadow-panel enabled:active:scale-[0.99]",
        selected
          ? "border-accent bg-accentSoft text-text"
          : "border-border bg-soft text-text hover:border-accent hover:bg-bg",
        "disabled:cursor-not-allowed disabled:opacity-80"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle as="span" className="text-inherit">{pkg.name}</CardTitle>
            <PillText as="span" className="text-muted">v{pkg.version}</PillText>
          </div>
          <BodyText className="mt-1 line-clamp-2 text-muted">
            {pkg.description || t(translation.PackageSearch.NoDescription)}
          </BodyText>
          {pkg.keywords.length > 0 ? (
            <BodyText className="mt-2 text-xs text-muted">
              {pkg.keywords.slice(0, 4).join(" • ")}
            </BodyText>
          ) : null}
        </div>
        <PillText
          className={clsx(
            "shrink-0 rounded-full border border-current/15 px-3 py-2",
            "transition-transform duration-300 group-enabled:group-hover:scale-105"
          )}
        >
          {selected ? t(translation.GlobalTerm.Selected) : t(translation.GlobalTerm.Add)}
        </PillText>
      </div>
    </button>
  );
}
