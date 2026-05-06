import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { translation } from "@renderer/i18n/translation";
import { BodyText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { legalItems } from "./settings-config";
import { SectionLabel } from "./SectionLabel";

export function LegalSection() {
  const { t } = useTranslation();

  return (
    <div className="border-t border-border pt-6">
      <SectionLabel>{t(translation.Settings.Legal)}</SectionLabel>
      <div className={clsx("rounded-2xl border border-border bg-soft", "divide-y divide-border")}>
        {legalItems.map((item) => (
          <div key={item} className="flex items-center justify-between px-5 py-4">
            <BodyText className="font-semibold">{t(item)}</BodyText>
            <UiIcon name="arrow-right" className="h-4 w-4 text-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
