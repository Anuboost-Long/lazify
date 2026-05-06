import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { BodyText, MonoText } from "@renderer/shared/typography";
import { translation } from "@renderer/i18n/translation";
import { applicationInfoItems } from "./settings-config";
import { SectionLabel } from "./SectionLabel";

export function ApplicationInfoSection() {
  const { t } = useTranslation();

  return (
    <div>
      <SectionLabel>{t(translation.Settings.Application)}</SectionLabel>
      <div className={clsx("rounded-2xl border border-border bg-soft", "divide-y divide-border")}>
        {applicationInfoItems.map((item) => (
          <div key={item.label} className="flex items-center justify-between px-5 py-4">
            <BodyText className="font-semibold">{t(item.label)}</BodyText>
            <MonoText className="rounded-lg bg-bg px-2.5 py-1">{item.value}</MonoText>
          </div>
        ))}
      </div>
    </div>
  );
}
