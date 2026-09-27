import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { useInterfaceSettings } from "@renderer/shared/hooks/use-interface-settings";
import { useKeepAwake } from "../hooks/use-keep-awake";
import { FileOpenSection } from "./FileOpenSection";
import { JsToolsSection } from "./JsToolsSection";
import { SectionLabel } from "./SectionLabel";
import { SettingRow } from "./SettingRow";
import { ToggleSwitch } from "./ToggleSwitch";

export function BehaviorSection() {
  const { t } = useTranslation();
  const { openAgentAfterSend, setOpenAgentAfterSend, rememberRoute, setRememberRoute } =
    useInterfaceSettings();
  const { keepAwake, updateKeepAwake } = useKeepAwake();

  return (
    <div className="flex flex-col gap-8">
      <FileOpenSection />

      <div className="border-t border-border pt-6">
        <SectionLabel>{t(translation.Settings.WhenYouAct)}</SectionLabel>
        <div className={clsx("rounded-2xl border border-border bg-soft", "divide-y divide-border")}>
          <div className="px-5">
            <SettingRow
              label={t(translation.Settings.OpenAgentAfterSend)}
              description={t(translation.Settings.OpenAgentAfterSendDesc)}
            >
              <ToggleSwitch enabled={openAgentAfterSend} onChange={setOpenAgentAfterSend} />
            </SettingRow>
          </div>
          <div className="px-5">
            <SettingRow
              label={t(translation.Settings.RememberRoute)}
              description={t(translation.Settings.RememberRouteDesc)}
            >
              <ToggleSwitch enabled={rememberRoute} onChange={setRememberRoute} />
            </SettingRow>
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <SectionLabel>{t(translation.Settings.WhileAgentsWork)}</SectionLabel>
        <div className="rounded-2xl border border-border bg-soft px-5">
          <SettingRow
            label={t(translation.Settings.KeepAwake)}
            description={t(translation.Settings.KeepAwakeDesc)}
          >
            <ToggleSwitch enabled={keepAwake} onChange={updateKeepAwake} />
          </SettingRow>
        </div>
      </div>

      <JsToolsSection />
    </div>
  );
}
