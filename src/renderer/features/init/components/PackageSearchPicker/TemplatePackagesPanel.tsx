import { OverlineText, BodyText, PillText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { useTranslation } from "react-i18next";
import { translation } from "@renderer/i18n/translation";
import type { TemplatePackagePreview } from "./types";
import { TemplatePackageCard } from "./TemplatePackageCard";

interface TemplatePackagesPanelProps {
  loading: boolean;
  error: string;
  packages: TemplatePackagePreview[];
}

export function TemplatePackagesPanel({ loading, error, packages }: TemplatePackagesPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-[20px] border border-border bg-bg p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <OverlineText className="text-accent">
            {t(translation.PackageSearch.TemplatePackages)}
          </OverlineText>
          <BodyText className="mt-2 text-muted">
            {t(translation.PackageSearch.TemplateDesc)}
          </BodyText>
        </div>
        <PillText className="rounded-full border border-border bg-soft px-3 py-2 text-muted">
          {t(translation.PackageSearch.QueuedCount, { count: packages.length })}
        </PillText>
      </div>

      {loading ? (
        <div className="mt-3 flex min-h-[2rem] items-center gap-2 rounded-[16px] border border-dashed border-border px-3 py-3 text-sm text-muted">
          <UiIcon name="refresh-circle" className="h-4 w-4 animate-spin text-accent" />
          {t(translation.PackageSearch.QueryingNpm)}
        </div>
      ) : null}

      {!loading && error ? (
        <div className="mt-3 rounded-[16px] border border-dashed border-border px-3 py-3 text-sm text-error">
          {error}
        </div>
      ) : null}

      {!loading && !error && packages.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {packages.map((pkg) => (
            <TemplatePackageCard key={pkg.name} pkg={pkg} />
          ))}
        </div>
      ) : null}

      {!loading && !error && packages.length === 0 ? (
        <div className="mt-3 rounded-[16px] border border-dashed border-border px-3 py-3 text-sm text-muted">
          {t(translation.PackageSearch.NoTemplateEntries)}
        </div>
      ) : null}
    </div>
  );
}
