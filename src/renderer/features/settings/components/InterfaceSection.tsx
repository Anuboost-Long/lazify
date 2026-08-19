import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { translation } from "@renderer/i18n/translation";
import { useInterfaceSettings } from "@renderer/shared/hooks/use-interface-settings";
import { SectionLabel } from "./SectionLabel";
import { SettingRow } from "./SettingRow";
import { ToggleSwitch } from "./ToggleSwitch";

export function InterfaceSection() {
  const { t } = useTranslation();
  const {
    compactSidebar, setCompactSidebar,
    reduceMotion,   setReduceMotion,
    showTooltips,   setShowTooltips,
    openAgentAfterSend, setOpenAgentAfterSend,
  } = useInterfaceSettings();

  return (
    <div className="border-t border-border pt-6">
      <SectionLabel>{t(translation.Settings.Interface)}</SectionLabel>
      <div className={clsx("rounded-2xl border border-border bg-soft", "divide-y divide-border")}>
        <div className="px-5">
          <SettingRow label={t(translation.Settings.CompactSidebar)} description={t(translation.Settings.CompactSidebarDesc)}>
            <ToggleSwitch enabled={compactSidebar} onChange={setCompactSidebar} />
          </SettingRow>
        </div>
        <div className="px-5">
          <SettingRow label={t(translation.Settings.ReduceMotion)} description={t(translation.Settings.ReduceMotionDesc)}>
            <ToggleSwitch enabled={reduceMotion} onChange={setReduceMotion} />
          </SettingRow>
        </div>
        <div className="px-5">
          <SettingRow label={t(translation.Settings.ShowTooltips)} description={t(translation.Settings.ShowTooltipsDesc)}>
            <ToggleSwitch enabled={showTooltips} onChange={setShowTooltips} />
          </SettingRow>
        </div>
        <div className="px-5">
          <SettingRow label={t(translation.Settings.OpenAgentAfterSend)} description={t(translation.Settings.OpenAgentAfterSendDesc)}>
            <ToggleSwitch enabled={openAgentAfterSend} onChange={setOpenAgentAfterSend} />
          </SettingRow>
        </div>
      </div>
    </div>
  );
}
