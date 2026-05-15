import { CardTitle, BodyText, PillText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { useTranslation } from "react-i18next";
import { translation } from "@renderer/i18n/translation";
import type { PackageOption } from "@renderer/shared/types/lazify";

interface SelectedPackageCardProps {
  pkg: PackageOption;
  busy: boolean;
  onRemove: () => void;
}

export function SelectedPackageCard({ pkg, busy, onRemove }: SelectedPackageCardProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-[18px] border border-border bg-bg px-4 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle as="span" className="text-text">{pkg.name}</CardTitle>
            {pkg.version ? (
              <PillText as="span" className="text-muted">v{pkg.version}</PillText>
            ) : null}
            {pkg.publisher ? (
              <PillText as="span" className="rounded-full border border-border bg-soft px-2 py-1 text-[10px] text-muted">
                {pkg.publisher}
              </PillText>
            ) : null}
          </div>
          <BodyText className="mt-1 text-muted">
            {pkg.description || t(translation.PackageSearch.SelectedForInstall)}
          </BodyText>
          {pkg.keywords.length > 0 ? (
            <BodyText className="mt-2 text-xs text-muted">
              {pkg.keywords.slice(0, 5).join(" • ")}
            </BodyText>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onRemove}
          disabled={busy}
          className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-soft px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted hover:border-accent hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t(translation.GlobalTerm.Remove)}
          <UiIcon name="xmark" className="h-4 w-4 text-muted group-hover:text-accent" />
        </button>
      </div>
    </div>
  );
}
