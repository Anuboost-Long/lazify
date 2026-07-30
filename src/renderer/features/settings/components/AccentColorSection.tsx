import clsx from "clsx";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import { useTranslation } from "react-i18next";
import { translation } from "@renderer/i18n/translation";
import { useAccentColor } from "@renderer/shared/hooks/use-accent-color";
import type { AccentColor } from "@renderer/shared/hooks/use-accent-color";
import { accentOptions } from "./settings-config";
import { SectionLabel } from "./SectionLabel";
import { SettingRow } from "./SettingRow";

export function AccentColorSection() {
  const { t } = useTranslation();
  const { accentColor, setAccentColor } = useAccentColor();

  return (
    <div className="border-t border-border pt-6">
      <SectionLabel>{t(translation.Settings.AccentColor)}</SectionLabel>
      <div className={clsx("rounded-2xl border border-border bg-soft p-5", "divide-y divide-border")}>
        <SettingRow label={t(translation.Settings.Color)} description={t(translation.Settings.AccentColorDesc)}>
          <div className="flex flex-wrap items-center gap-2">
            {accentOptions.map((accent) => (
              // The swatch is colour and nothing else, so its name lives here.
              <Tooltip key={accent.id} content={t(accent.label)} side="top">
                <button
                  type="button"
                  aria-label={t(accent.label)}
                  onClick={() => setAccentColor(accent.id as AccentColor)}
                  className={clsx(
                    "h-7 w-7 rounded-full transition-all duration-100",
                    accent.color,
                    accentColor === accent.id
                      ? "scale-110 ring-2 ring-accent ring-offset-2 ring-offset-soft"
                      : "opacity-60 hover:opacity-100"
                  )}
                />
              </Tooltip>
            ))}
          </div>
        </SettingRow>
      </div>
    </div>
  );
}
