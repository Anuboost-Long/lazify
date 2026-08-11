import clsx from "clsx";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { BodyText, CaptionText, OverlineText, SectionTitle } from "@renderer/shared/typography";
import { TextInput } from "@renderer/shared/ui/form/FormInput";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";

interface AgentMonitorRenameModalProps {
  panel: { runId: string; label: string; title?: string } | null;
  onRename: (runId: string, title: string) => void;
  onClose: () => void;
}

export function AgentMonitorRenameModal({
  panel,
  onRename,
  onClose,
}: Readonly<AgentMonitorRenameModalProps>) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");

  useEffect(() => {
    setValue(panel?.title ?? "");
  }, [panel]);

  const submit = () => {
    if (panel) onRename(panel.runId, value);
    onClose();
  };

  return (
    <BaseModal open={panel !== null} onClose={onClose}>
      <div
        className={clsx(
          "w-[26rem] max-w-[calc(100vw-2rem)] overflow-hidden",
          "rounded-shell border border-border bg-soft shadow-panel"
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-5">
          <div className="min-w-0">

            <OverlineText className="truncate text-muted">{panel?.label ?? ""}</OverlineText>
            <SectionTitle className="mt-1 truncate text-2xl">
              {t(translation.Agents.MonitorRename)}
            </SectionTitle>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t(translation.GlobalTerm.Close)}
            className={clsx(
              "shrink-0 rounded-xl border border-border bg-bg p-2 transition-colors duration-150",
              "text-muted hover:border-accent/30 hover:text-text"
            )}
          >
            <UiIcon name="xmark" className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          <CaptionText tone="muted">{t(translation.Agents.MonitorRenameDesc)}</CaptionText>

          <TextInput
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
            placeholder={t(translation.Agents.MonitorRenamePlaceholder)}
          />

          <div className="flex items-center justify-between gap-2">

            <button
              type="button"
              onClick={() => {
                if (panel) onRename(panel.runId, "");
                onClose();
              }}
              disabled={!panel?.title}
              className={clsx(
                "rounded-xl border border-border bg-bg px-4 py-2 transition-colors duration-150",
                "text-muted enabled:hover:border-accent/30 enabled:hover:text-text",
                "disabled:cursor-not-allowed disabled:opacity-45"
              )}
            >
              <BodyText>{t(translation.Agents.MonitorRenameReset)}</BodyText>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className={clsx(
                  "rounded-xl border border-border bg-bg px-4 py-2 transition-colors duration-150",
                  "text-muted hover:border-accent/30 hover:text-text"
                )}
              >
                <BodyText>{t(translation.GlobalTerm.Cancel)}</BodyText>
              </button>

              <button
                type="button"
                onClick={submit}
                className={clsx(
                  "rounded-xl border px-4 py-2 transition-colors duration-150",
                  "border-accent/40 bg-accent/10 text-accent",
                  "hover:border-accent hover:bg-accent/[0.16]"
                )}
              >
                <BodyText tone="accent">{t(translation.GlobalTerm.Save)}</BodyText>
              </button>
            </div>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}
