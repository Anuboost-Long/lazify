import { useTranslation } from "react-i18next";

import { EnvPane } from "@renderer/features/env";
import { translation } from "@renderer/i18n/translation";
import { SmallText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { railPanelShell, type RailPanelVariant } from "../rail-panel-shell";

interface AgentEnvPanelProps {
  projectPath: string;
  onClose: () => void;
  variant?: RailPanelVariant;
}

/** The env reader as an agent rail panel: the shared pane under a rail header. */
export function AgentEnvPanel({ projectPath, onClose, variant = "rail" }: Readonly<AgentEnvPanelProps>) {
  const { t } = useTranslation();

  return (
    <aside className={railPanelShell(variant)}>
      <header className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        <UiIcon name="key" className="ml-1 h-3.5 w-3.5 text-muted" />

        <SmallText as="span" className="!text-text truncate">
          {t(translation.EnvPane.Title)}
        </SmallText>

        <div className="ml-auto flex items-center">
          <IconButton
            icon="xmark"
            aria-label={t(translation.GlobalTerm.Close)}
            onClick={onClose}
            className="text-text"
          />
        </div>
      </header>

      <EnvPane projectPath={projectPath} />
    </aside>
  );
}
