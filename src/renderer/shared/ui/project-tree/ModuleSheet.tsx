import clsx from "clsx";
import { translation } from "@renderer/i18n/translation";
import { BodyText, CardTitle, OverlineText, PillText } from "@renderer/shared/typography";
import { structureOptions } from "@renderer/shared/ui/project-tree/constants/structure-options";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BaseBottomSheet } from "@renderer/shared/ui/modal/BaseBottomSheet";
import { useTranslation } from "react-i18next";

interface ModuleSheetProps {
  open: boolean;
  busy: boolean;
  lockedFolderNames: Set<string>;
  selectedStructurePaths: string[];
  onClose: () => void;
  onToggleStructurePath: (path: string) => void;
}

export function ModuleSheet({
  open,
  busy,
  lockedFolderNames,
  selectedStructurePaths,
  onClose,
  onToggleStructurePath
}: ModuleSheetProps) {
  const { t } = useTranslation();

  return (
    <BaseBottomSheet
      open={open}
      onClose={onClose}
      maxHeight="78vh"
      wrapperClassName="max-w-3xl"
      panelClassName="rounded-[30px] border border-border bg-soft text-text shadow-[0_30px_80px_rgba(0,0,0,0.28)]"
    >
      <div
        className="relative overflow-hidden border-b border-border px-5 py-4"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-soft) 94%, white 6%), color-mix(in srgb, var(--color-bg-soft) 97%, var(--color-accent) 3%))"
        }}
      >
        <div className="pointer-events-none absolute left-1/2 top-2 h-1.5 w-16 -translate-x-1/2 rounded-full bg-emerald-500/20" />
        <div className="pointer-events-none absolute right-[-32px] top-[-52px] h-28 w-28 rounded-full bg-cyan-400/8 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-38px] left-5 h-24 w-24 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4 pt-3">
          <div className="min-w-0">
            <OverlineText className="text-accent">
              {t(translation.ProjectTree.StructureModules)}
            </OverlineText>
            <CardTitle className="mt-2">
              {t(translation.ProjectTree.StructureModulesTitle)}
            </CardTitle>
            <BodyText className="mt-1 text-slate-600 dark:text-muted">
              {t(translation.ProjectTree.StructureModulesDesc)}
            </BodyText>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-bg/90 text-text shadow-[0_12px_30px_rgba(15,23,42,0.18)] hover:border-accent hover:text-accent"
            aria-label={t(translation.ProjectTree.CloseModuleSelector)}
          >
            <UiIcon name="xmark" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 overflow-y-auto p-5">
        <div className="space-y-3">
          {structureOptions.map((option) => {
            const locked = lockedFolderNames.has(option.path);
            const active = locked || selectedStructurePaths.includes(option.path);

            return (
              <button
                key={option.path}
                type="button"
                disabled={busy || locked}
                onClick={() => onToggleStructurePath(option.path)}
                className={clsx(
                  "w-full rounded-[20px] border px-4 py-3 text-left duration-200",
                  active
                    ? "border-accent text-text shadow-[0_10px_24px_rgba(16,185,129,0.16)]"
                    : "border-slate-300/80 bg-white text-slate-900 hover:border-accent dark:border-border dark:bg-bg dark:text-text",
                  "disabled:cursor-not-allowed disabled:opacity-60"
                )}
                style={
                  active
                    ? {
                        background:
                          "linear-gradient(135deg, rgba(16,185,129,0.14), rgba(6,182,212,0.06))"
                      }
                    : {
                        background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))"
                      }
                }
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle as="span" className="text-slate-900 dark:text-text">{option.label}</CardTitle>
                      <PillText as="span" className="text-slate-500 dark:text-muted">
                        {option.path}/
                      </PillText>
                    </div>
                    <BodyText className="mt-1 text-slate-600 dark:text-muted">
                      {locked
                        ? `${option.description} ${t(translation.ProjectTree.RequiredFolderNotice)}`
                        : option.description}
                    </BodyText>
                  </div>
                  <div
                    className={clsx(
                      "shrink-0 rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em]",
                      locked
                        ? "border-amber-700/45 bg-amber-200 text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300"
                        : active
                          ? "border-emerald-800/40 bg-emerald-200 text-emerald-950 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300"
                          : "border-slate-500/35 bg-slate-300 text-slate-950 dark:border-border dark:bg-soft dark:text-muted"
                    )}
                  >
                    {locked ? t(translation.ProjectTree.Locked) : active ? t(translation.ProjectTree.On) : t(translation.ProjectTree.Off)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </BaseBottomSheet>
  );
}
