import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { BodyText, SectionTitle } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "./BaseModal";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: string;
  /** Defaults to the generic "Confirm"; pass a verb that names the action. */
  confirmLabel?: string;
  /** Red confirm button for anything that destroys work. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Small yes/no gate for actions that cannot be undone. */
export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  destructive = false,
  onConfirm,
  onCancel
}: Readonly<ConfirmModalProps>) {
  const { t } = useTranslation();

  return (
    <BaseModal open={open} onClose={onCancel}>
      <div className="w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-shell border border-border bg-soft shadow-panel">
        <div className="flex items-start gap-3 px-5 pt-5">
          <div
            className={clsx(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
              destructive
                ? "border-rose-500/30 bg-rose-500/15 text-rose-400"
                : "border-border bg-bg text-muted"
            )}
          >
            <UiIcon name="warning-triangle" className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <SectionTitle className="text-lg">{title}</SectionTitle>
            {description ? (
              <BodyText className="mt-1 text-xs text-muted">{description}</BodyText>
            ) : null}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 pb-5 pt-5">
          <button
            type="button"
            onClick={onCancel}
            className={clsx(
              "rounded-xl border border-border bg-bg px-4 py-2 text-sm text-muted",
              "transition-colors duration-150 hover:border-accent/30 hover:text-text"
            )}
          >
            {t(translation.GlobalTerm.Cancel)}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={clsx(
              "rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors duration-150",
              destructive ? "bg-rose-500 hover:bg-rose-400" : "bg-accent hover:opacity-90"
            )}
          >
            {confirmLabel ?? t(translation.GlobalTerm.Confirm)}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
