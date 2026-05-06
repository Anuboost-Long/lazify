import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { translation } from "@renderer/i18n/translation";
import { SectionLabel } from "./SectionLabel";
import { SettingRow } from "./SettingRow";
import { ToggleSwitch } from "./ToggleSwitch";

export function InterfaceSection() {
  const { t } = useTranslation();

  return (
    <div className="border-t border-border pt-6">
      <SectionLabel>{t(translation.Settings.Interface)}</SectionLabel>
      <div className={clsx("rounded-2xl border border-border bg-soft", "divide-y divide-border")}>
        <div className="px-5">
          <SettingRow label={t(translation.Settings.CompactSidebar)} description={t(translation.Settings.CompactSidebarDesc)}>
            <ToggleSwitch enabled={false} />
          </SettingRow>
        </div>
        <div className="px-5">
          <SettingRow label={t(translation.Settings.ReduceMotion)} description={t(translation.Settings.ReduceMotionDesc)}>
            <ToggleSwitch enabled={false} />
          </SettingRow>
        </div>
        <div className="px-5">
          <SettingRow label={t(translation.Settings.ShowTooltips)} description={t(translation.Settings.ShowTooltipsDesc)}>
            <ToggleSwitch enabled={true} />
          </SettingRow>
        </div>
      </div>
    </div>
  );
}
