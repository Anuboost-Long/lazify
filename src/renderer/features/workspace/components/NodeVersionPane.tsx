import { useEffect, useState } from "react";
import clsx from "clsx";
import { translation } from "@renderer/i18n/translation";
import { BodyText, CardTitle, MonoText, OverlineText, PillText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { LabelButton } from "@renderer/shared/ui/LabelButton";
import type { NvmNodeVersion, NvmVersionList } from "@renderer/shared/types/lazify";
import { useTranslation } from "react-i18next";

interface NodeVersionPaneProps {
  projectPath: string;
  pinnedVersion: string | null | undefined;
  onVersionChange: (version: string | null) => void;
}

export function NodeVersionPane({ projectPath: _projectPath, pinnedVersion, onVersionChange }: NodeVersionPaneProps) {
  const { t } = useTranslation();

  const [versionList, setVersionList] = useState<NvmVersionList | null>(null);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const result = await globalThis.lazify.nvmListVersions();
      setVersionList(result);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadVersions();
  }, []);

  const handleSwitch = async (version: string) => {
    setSwitching(true);
    setFeedback(null);
    try {
      const result = await globalThis.lazify.nvmUse(version);
      if (result.success) {
        onVersionChange(version);
        setFeedback({ ok: true, message: t(translation.NodeVersionPane.SwitchSuccess, { version }) });
      } else {
        setFeedback({ ok: false, message: result.output || t(translation.NodeVersionPane.SwitchError) });
      }
    } catch (err) {
      setFeedback({ ok: false, message: err instanceof Error ? err.message : t(translation.NodeVersionPane.SwitchError) });
    } finally {
      setSwitching(false);
    }
  };

  const handleClear = () => {
    onVersionChange(null);
    setFeedback(null);
  };

  const nvmAvailable = versionList?.nvmAvailable ?? false;
  const versions: NvmNodeVersion[] = versionList?.versions ?? [];

  return (
    <div className="overflow-hidden rounded-[26px] border border-border bg-bg shadow-panel">

      {/* ── Header ── */}
      <div className="flex items-center gap-2 border-b border-border bg-soft px-5 py-3.5">
        <UiIcon name="activity" className="h-4 w-4 text-muted" />
        <OverlineText className="min-w-0 flex-1 text-muted">
          {t(translation.NodeVersionPane.Title)}
        </OverlineText>
        <LabelButton
          label={loading ? translation.GlobalTerm.Scanning : translation.GlobalTerm.Refresh}
          loading={loading}
          disabled={loading || switching}
          onClick={() => void loadVersions()}
        />
      </div>

      <div className="space-y-4 p-4">

        {/* ── Pinned version strip ── */}
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-soft px-4 py-3">
          <div className={clsx(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border",
            "border-black/[0.06] dark:border-white/[0.04]",
            pinnedVersion ? "bg-accent/10 text-accent" : "bg-bg text-muted"
          )}>
            <UiIcon name="activity" className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <OverlineText className="text-muted">{t(translation.NodeVersionPane.Pinned)}</OverlineText>
            <MonoText as="span" className={clsx(
              "mt-0.5 block text-[13px] font-semibold",
              pinnedVersion ? "text-text" : "text-muted"
            )}>
              {pinnedVersion ?? t(translation.NodeVersionPane.NonePinned)}
            </MonoText>
          </div>
          {pinnedVersion && (
            <LabelButton
              label={translation.NodeVersionPane.Clear}
              icon="xmark"
              disabled={switching}
              onClick={handleClear}
              className="hover:border-error/30 hover:text-error"
            />
          )}
        </div>

        {/* ── Feedback banner ── */}
        {feedback && (
          <div className={clsx(
            "rounded-2xl border px-4 py-3 text-sm",
            feedback.ok
              ? "border-success/25 bg-success/8 text-success"
              : "border-error/25 bg-error/8 text-error"
          )}>
            {feedback.message}
          </div>
        )}

        {/* ── nvm unavailable ── */}
        {!loading && versionList && !nvmAvailable && (
          <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-border bg-soft/30 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-soft text-muted">
              <UiIcon name="activity" className="h-6 w-6" />
            </div>
            <CardTitle className="mt-4 text-base">{t(translation.NodeVersionPane.NvmUnavailable)}</CardTitle>
            <BodyText tone="muted" className="mt-2 max-w-xs text-sm">
              {t(translation.NodeVersionPane.NvmUnavailableDesc)}
            </BodyText>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
            <UiIcon name="refresh-circle" className="h-4 w-4 animate-spin text-accent" />
            {t(translation.NodeVersionPane.Loading)}
          </div>
        )}

        {/* ── Version list ── */}
        {!loading && nvmAvailable && versions.length > 0 && (
          <div>
            <OverlineText className="mb-2 px-1 text-muted">
              {t(translation.NodeVersionPane.AvailableVersions)}
            </OverlineText>
            <div className="grid gap-1.5">
              {versions.map((v) => {
                const isPinned = pinnedVersion === v.version;
                return (
                  <div
                    key={v.version}
                    className={clsx(
                      "group relative overflow-hidden rounded-2xl border transition-[border-color,box-shadow] duration-200",
                      "border-black/[0.06] dark:border-white/[0.04]",
                      isPinned ? "bg-accent/5" : "bg-soft"
                    )}
                  >
                    {/* Left accent rail */}
                    <div className={clsx(
                      "pointer-events-none absolute inset-y-0 left-0 w-[3px] rounded-r-full transition-colors duration-300",
                      v.current
                        ? "bg-success/70"
                        : isPinned
                          ? "bg-accent"
                          : "bg-border/30 group-hover:bg-border/60"
                    )} />

                    <div className="flex items-center gap-3 py-2.5 pl-5 pr-4">
                      <div className={clsx(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border text-[10px] font-bold",
                        "border-black/[0.06] dark:border-white/[0.04]",
                        v.current ? "bg-success/10 text-success" : isPinned ? "bg-accent/10 text-accent" : "bg-bg text-muted"
                      )}>
                        <UiIcon name="activity" className="h-3.5 w-3.5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <MonoText as="span" className="block text-[13px] font-semibold leading-tight text-text">
                          {v.version}
                        </MonoText>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          {v.current && (
                            <PillText as="span" className="rounded-full border border-success/25 bg-success/8 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-success">
                              {t(translation.NodeVersionPane.Current)}
                            </PillText>
                          )}
                          {v.lts && (
                            <PillText as="span" className="rounded-full border border-border bg-bg px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-muted">
                              {t(translation.NodeVersionPane.Lts)} · {v.lts}
                            </PillText>
                          )}
                        </div>
                      </div>

                      <LabelButton
                        label={isPinned ? translation.NodeVersionPane.Switch : translation.NodeVersionPane.PinAndSwitch}
                        variant="accent"
                        loading={switching}
                        disabled={switching || isPinned}
                        onClick={() => void handleSwitch(v.version)}
                        className={isPinned ? "cursor-default opacity-60" : ""}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
