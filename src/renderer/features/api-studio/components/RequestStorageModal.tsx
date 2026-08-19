import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";
import type { RequestStorage } from "../types";

interface RequestStorageModalProps {
  open: boolean;
  location: RequestStorage | null;
  onChoose: (location: RequestStorage) => void;
  onClose: () => void;
}

interface StorageChoice {
  id: RequestStorage;
  icon: "hard-drive" | "folder";
  label: string;
  hint: string;
}

const CHOICES: StorageChoice[] = [
  {
    id: "app",
    icon: "hard-drive",
    label: translation.ApiStudio.StorageApp,
    hint: translation.ApiStudio.StorageAppHint
  },
  {
    id: "project",
    icon: "folder",
    label: translation.ApiStudio.StorageProject,
    hint: translation.ApiStudio.StorageProjectHint
  }
];

export function RequestStorageModal({
  open,
  location,
  onChoose,
  onClose
}: Readonly<RequestStorageModalProps>) {
  const { t } = useTranslation();

  return (
    <BaseModal open={open} onClose={onClose}>
      <div
        className={clsx(
          "w-[440px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-shell border border-border",
          "bg-soft shadow-panel"
        )}
      >
        <div className="px-5 pt-5">
          <p className="text-base font-semibold text-text">
            {t(translation.ApiStudio.StorageTitle)}
          </p>
          <p className="mt-1.5 text-xs leading-5 text-muted">
            {t(translation.ApiStudio.StorageDescription)}
          </p>
        </div>

        <div className="flex flex-col gap-2 px-5 py-4">
          {CHOICES.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => onChoose(choice.id)}
              className={clsx(
                "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                location === choice.id
                  ? "border-accent/50 bg-accent/[0.06]"
                  : "border-border bg-bg/45 hover:border-accent/40"
              )}
            >
              <span
                className={clsx(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  location === choice.id ? "bg-accent/10 text-accent" : "bg-text/[0.06] text-muted"
                )}
              >
                <UiIcon name={choice.icon} className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-text">{t(choice.label)}</span>
                <span className="mt-0.5 block text-xs leading-5 text-muted">{t(choice.hint)}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="flex justify-end border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-muted transition-colors hover:text-text"
          >
            {t(translation.GlobalTerm.Cancel)}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
