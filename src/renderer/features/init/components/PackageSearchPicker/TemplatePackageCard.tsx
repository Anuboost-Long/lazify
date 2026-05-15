import { CardTitle, BodyText, PillText } from "@renderer/shared/typography";
import { useTranslation } from "react-i18next";
import { translation } from "@renderer/i18n/translation";
import type { TemplatePackagePreview } from "./types";

interface TemplatePackageCardProps {
  pkg: TemplatePackagePreview;
}

export function TemplatePackageCard({ pkg }: TemplatePackageCardProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-[18px] border border-border bg-soft px-4 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle as="span" className="text-text">{pkg.name}</CardTitle>
            <PillText as="span" className="text-muted">
              npm v{pkg.version || pkg.requestedVersion}
            </PillText>
          </div>
          <BodyText className="mt-1 text-muted">
            {pkg.description || t(translation.PackageSearch.NoDescriptionReturned)}
          </BodyText>
          <BodyText className="mt-2 text-xs text-muted">
            {t(translation.PackageSearch.TemplateVersion, { version: pkg.requestedVersion })}
          </BodyText>
        </div>
        <PillText className="shrink-0 rounded-full border border-current/15 px-3 py-2 text-muted">
          {t(translation.PackageSearch.WillAdd)}
        </PillText>
      </div>
    </div>
  );
}
