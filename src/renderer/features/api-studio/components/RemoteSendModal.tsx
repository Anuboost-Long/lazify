import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { BodyText, SectionTitle } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";

interface RemoteSendModalProps {
  open: boolean;
  host: string;
  onSendOnce: () => void;
  onAlwaysAllow: () => void;
  onCancel: () => void;
}

const ACTION = "h-9 whitespace-nowrap rounded-xl px-4 text-sm transition-colors duration-150";

export function RemoteSendModal(props: Readonly<RemoteSendModalProps>) {
  return (
    <BaseModal open={props.open} onClose={props.onCancel}>
      {props.open ? <RemoteSendCard {...props} /> : null}
    </BaseModal>
  );
}

function RemoteSendCard({
  host,
  onSendOnce,
  onAlwaysAllow,
  onCancel
}: Readonly<RemoteSendModalProps>) {
  const { t } = useTranslation();

  return (
    <div
      className={clsx(
        "w-[460px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-shell border border-border",
        "bg-soft shadow-panel"
      )}
    >
      <div className="flex items-start gap-3 px-5 pt-5">
        <div
          className={clsx(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
            "border-border bg-bg text-muted"
          )}
        >
          <UiIcon name="warning-triangle" className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <SectionTitle className="text-lg">
            {t(translation.ApiStudio.SendRemoteTitle)}
          </SectionTitle>
          <p className="mt-1 truncate font-mono text-xs text-text" title={host}>
            {host}
          </p>
          <BodyText className="mt-2 text-xs text-muted">
            {t(translation.ApiStudio.SendRemoteDescription)}
          </BodyText>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 px-5 pb-5 pt-5">
        <button
          type="button"
          onClick={onCancel}
          className={clsx(ACTION, "shrink-0 text-muted hover:text-text")}
        >
          {t(translation.GlobalTerm.Cancel)}
        </button>
        <button
          type="button"
          onClick={onAlwaysAllow}
          className={clsx(
            ACTION,
            "shrink-0 border border-border bg-bg text-text hover:border-accent/30"
          )}
        >
          {t(translation.ApiStudio.AlwaysAllowHost)}
        </button>
        <button
          type="button"
          onClick={onSendOnce}
          className={clsx(ACTION, "shrink-0 bg-accent font-medium text-white hover:opacity-90")}
        >
          {t(translation.ApiStudio.SendRemoteConfirm)}
        </button>
      </div>
    </div>
  );
}
