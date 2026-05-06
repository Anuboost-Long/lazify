import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { translation } from "@renderer/i18n/translation";
import { accentOptions } from "./settings-config";
import { SectionLabel } from "./SectionLabel";
import { SettingRow } from "./SettingRow";

interface AccentColorSectionProps {
  selectedAccent: string;
  onSelectAccent: (accentId: string) => void;
}

export function AccentColorSection({ selectedAccent, onSelectAccent }: AccentColorSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="border-t border-border pt-6">
      <SectionLabel>{t(translation.Settings.AccentColor)}</SectionLabel>
      <div className={clsx("rounded-2xl border border-border bg-soft p-5", "divide-y divide-border")}>
        <SettingRow label={t(translation.Settings.Color)} description={t(translation.Settings.AccentColorDesc)}>
          <div className="flex items-center gap-2">
            {accentOptions.map((accent) => (
              <button
                key={accent.id}
                type="button"
                onClick={() => onSelectAccent(accent.id)}
                title={t(accent.label)}
                className={clsx(
                  "h-7 w-7 rounded-full transition-all duration-100",
                  accent.color,
                  selectedAccent === accent.id
                    ? "scale-110 ring-2 ring-accent ring-offset-2 ring-offset-soft"
                    : "opacity-60 hover:opacity-100"
                )}
              />
            ))}
          </div>
        </SettingRow>
      </div>
    </div>
  );
}
