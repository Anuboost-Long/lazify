import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { translation } from "@renderer/i18n/translation";
import { useBrowserSettings } from "@renderer/shared/hooks/use-browser-settings";
import { SmallText } from "@renderer/shared/typography";
import { SearchEnginePicker } from "./SearchEnginePicker";
import { SectionLabel } from "./SectionLabel";
import { SettingRow } from "./SettingRow";
import { ToggleSwitch } from "./ToggleSwitch";

export function BrowserSection() {
  const { t } = useTranslation();
  const { restoreTabs, setRestoreTabs } = useBrowserSettings();

  return (
    <div className="space-y-6">
      <div>
        <SectionLabel>{t(translation.Settings.SearchEngine)}</SectionLabel>
        <SmallText className="!text-muted mb-3 block leading-5">
          {t(translation.Settings.SearchEngineDesc)}
        </SmallText>
        <SearchEnginePicker />
      </div>

      <div>
        <SectionLabel>{t(translation.Settings.BrowserSession)}</SectionLabel>
        <div className={clsx("rounded-2xl border border-border bg-soft", "divide-y divide-border")}>
          <div className="px-5">
            <SettingRow
              label={t(translation.Settings.RestoreTabs)}
              description={t(translation.Settings.RestoreTabsDesc)}
            >
              <ToggleSwitch enabled={restoreTabs} onChange={setRestoreTabs} />
            </SettingRow>
          </div>
        </div>
      </div>
    </div>
  );
}
