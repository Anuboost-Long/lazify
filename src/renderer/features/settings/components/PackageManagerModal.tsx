import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { translation } from "@renderer/i18n/translation";
import { BodyText, OverlineText, PillText, SectionTitle } from "@renderer/shared/typography";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { DetectedTool } from "@renderer/shared/types/lazify";
import type { PreferredPackageManager } from "@renderer/shared/hooks/use-preferred-package-manager";

interface PackageManagerModalProps {
  open: boolean;
  tools: DetectedTool[];
  current: PreferredPackageManager;
  onSelect: (pm: PreferredPackageManager) => void;
  onClose: () => void;
}

const PM_NAMES: PreferredPackageManager[] = ["npm", "yarn", "pnpm", "bun"];

const PM_COLORS: Record<PreferredPackageManager, string> = {
  npm:  "bg-rose-500/15 border-rose-500/30 text-rose-400",
  yarn: "bg-sky-500/15 border-sky-500/30 text-sky-400",
  pnpm: "bg-amber-500/15 border-amber-500/30 text-amber-400",
  bun:  "bg-yellow-500/15 border-yellow-500/30 text-yellow-400",
};

const PM_SELECTED_COLORS: Record<PreferredPackageManager, string> = {
  npm:  "border-rose-400/60 bg-rose-500/8",
  yarn: "border-sky-400/60 bg-sky-500/8",
  pnpm: "border-amber-400/60 bg-amber-500/8",
  bun:  "border-yellow-400/60 bg-yellow-500/8",
};

const ACCENT_LINE = {
  background: "linear-gradient(to right, transparent, var(--color-accent), transparent)",
  opacity: 0.55,
} as const;

export function PackageManagerModal({ open, tools, current, onSelect, onClose }: PackageManagerModalProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<PreferredPackageManager>(current);

  function getToolByName(name: string) {
    return tools.find((t) => t.name === name);
  }

  function handleConfirm() {
    onSelect(selected);
    onClose();
  }

  return (
    <BaseModal open={open} onClose={onClose}>
      <div className="w-[480px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-shell border border-border bg-soft shadow-panel">

        {/* Header */}
        <div className="relative overflow-hidden border-b border-border px-6 py-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={ACCENT_LINE} />
          <div className="flex items-center justify-between gap-4">
            <div>
              <OverlineText className="text-muted">{t(translation.Settings.JsTools)}</OverlineText>
              <SectionTitle className="mt-1 text-2xl">{t(translation.Settings.PackageManagerModalTitle)}</SectionTitle>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border bg-bg p-2 text-muted transition-colors duration-150 hover:border-accent/30 hover:text-text"
            >
              <UiIcon name="xmark" className="h-4 w-4" />
            </button>
          </div>
          <BodyText className="mt-2 text-xs text-muted">
            {t(translation.Settings.PackageManagerModalDesc)}
          </BodyText>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-3">
            {PM_NAMES.map((pmName) => {
              const tool = getToolByName(pmName);
              const isAvailable = tool?.available ?? false;
              const isSelected = selected === pmName;
              const isSelectable = isAvailable;

              return (
                <button
                  key={pmName}
                  type="button"
                  disabled={!isSelectable}
                  onClick={() => isSelectable && setSelected(pmName)}
                  className={clsx(
                    "relative flex flex-col gap-3 rounded-2xl border p-4 text-left transition-all duration-150",
                    isSelectable ? "cursor-pointer" : "cursor-not-allowed opacity-45",
                    isSelected && isSelectable
                      ? PM_SELECTED_COLORS[pmName]
                      : "border-border bg-bg hover:border-accent/30"
                  )}
                >
                  {/* Selected checkmark */}
                  {isSelected && isSelectable && (
                    <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-accent">
                      <UiIcon name="check-circle" className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}

                  {/* PM name badge */}
                  <span
                    className={clsx(
                      "inline-flex w-fit items-center rounded-lg border px-2.5 py-1 text-xs font-bold uppercase tracking-wider",
                      PM_COLORS[pmName]
                    )}
                  >
                    {pmName}
                  </span>

                  {/* Version / status */}
                  <div>
                    {isAvailable && tool ? (
                      <>
                        <PillText as="p" className="block truncate font-mono text-[10px] text-accent">
                          {tool.version ?? "—"}
                        </PillText>
                        <PillText as="p" className="mt-0.5 text-[10px] text-muted">
                          Installed
                        </PillText>
                      </>
                    ) : (
                      <PillText as="p" className="text-[10px] text-muted/50">
                        Not found
                      </PillText>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {tools.length === 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-bg px-4 py-3">
              <UiIcon name="warning-triangle" className="h-4 w-4 shrink-0 text-warning" />
              <BodyText className="text-xs text-muted">
                No scan data available. Run a scan from the Environment page first.
              </BodyText>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[16px] border border-border bg-bg px-4 py-2.5 text-sm font-semibold text-muted transition-colors duration-150 hover:border-accent/30 hover:text-text"
          >
            {t(translation.GlobalTerm.Cancel)}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-[16px] border border-transparent bg-accent px-5 py-2.5 text-sm font-semibold text-bg transition-colors duration-150 hover:bg-accentHover"
          >
            {t(translation.Settings.SelectPackageManager)}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
