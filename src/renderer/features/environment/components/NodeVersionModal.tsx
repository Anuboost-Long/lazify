import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import { translation } from "@renderer/i18n/translation";
import { BodyText, CardTitle, MonoText, OverlineText, PillText, SectionTitle, Typography } from "@renderer/shared/typography";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { NvmNodeVersion } from "@renderer/shared/types/lazify";
import { useTranslation } from "react-i18next";

interface NodeVersionModalProps {
  open: boolean;
  onClose: () => void;
  onSelect?: (version: string) => void;
}

type ModalState = "loading" | "nvm-missing" | "nvm-empty" | "ready" | "installing" | "install-done";

const ACCENT_LINE = {
  background: "linear-gradient(to right, transparent, var(--color-accent), transparent)",
  opacity: 0.55,
} as const;

export function NodeVersionModal({ open, onClose, onSelect }: NodeVersionModalProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<ModalState>("loading");
  const [versions, setVersions] = useState<NvmNodeVersion[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [installOutput, setInstallOutput] = useState("");
  const [installSuccess, setInstallSuccess] = useState(false);
  const [applying, setApplying] = useState<"session" | "default" | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    const result = await globalThis.lazify.nvmListVersions();
    if (!result.nvmAvailable) {
      setState("nvm-missing");
    } else if (result.versions.length === 0) {
      setState("nvm-empty");
    } else {
      setVersions(result.versions);
      const current = result.versions.find((v) => v.current);
      setSelected(current?.version ?? result.versions[0]?.version ?? null);
      setState("ready");
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const handleInstall = useCallback(async () => {
    setState("installing");
    const result = await globalThis.lazify.installNvm();
    setInstallOutput(result.output);
    setInstallSuccess(result.success);
    setState("install-done");
  }, []);

  const handleUseSession = useCallback(() => {
    if (!selected) return;
    onSelect?.(selected);
    onClose();
  }, [selected, onSelect, onClose]);

  const handleSetDefault = useCallback(async () => {
    if (!selected) return;
    setApplying("default");
    await globalThis.lazify.nvmSetDefault(selected);
    setApplying(null);
    onSelect?.(selected);
    onClose();
  }, [selected, onSelect, onClose]);

  return (
    <BaseModal open={open} onClose={onClose}>
      <div className="w-[480px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-shell border border-border bg-soft shadow-panel">

        {/* Header */}
        <div className="relative overflow-hidden border-b border-border px-6 py-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={ACCENT_LINE} />
          <div className="flex items-center justify-between gap-4">
            <div>
              <OverlineText className="text-muted">{t(translation.NodeVersionModal.Eyebrow)}</OverlineText>
              <SectionTitle className="mt-1 text-2xl">{t(translation.NodeVersionModal.Title)}</SectionTitle>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border bg-bg p-2 text-muted transition-colors duration-150 hover:border-accent/30 hover:text-text"
            >
              <UiIcon name="xmark" className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">

          {/* Loading */}
          {state === "loading" && (
            <div className="flex items-center justify-center gap-3 py-8 text-sm text-muted">
              <UiIcon name="refresh-circle" className="h-4 w-4 animate-spin text-accent" />
              <BodyText as="span" className="text-muted">{t(translation.NodeVersionModal.ScanningNvm)}</BodyText>
            </div>
          )}

          {/* nvm not installed */}
          {state === "nvm-missing" && (
            <div className="space-y-3">
              <div className="rounded-[20px] border border-warning/20 bg-warning/5 px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-warning/25 bg-warning/10 text-warning">
                    <UiIcon name="warning-triangle" className="h-4 w-4" />
                  </div>
                  <div>
                    <BodyText className="font-semibold text-text">{t(translation.NodeVersionModal.NvmNotInstalled)}</BodyText>
                    <BodyText className="mt-1 text-xs text-muted">
                      {t(translation.NodeVersionModal.NvmDesc)}
                    </BodyText>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleInstall}
                className={clsx(
                  "group relative w-full overflow-hidden rounded-[20px] border border-accent/30 bg-accent/8 px-4 py-4",
                  "text-left transition-colors duration-150 hover:border-accent/50 hover:bg-accent/12"
                )}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={ACCENT_LINE} />
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
                    <UiIcon name="play" className="h-4 w-4" />
                  </div>
                  <div>
                    <BodyText className="font-semibold text-accent">{t(translation.NodeVersionModal.InstallNvm)}</BodyText>
                    <PillText className="mt-0.5 text-accent/60">
                      {t(translation.NodeVersionModal.InstallNvmSubtitle)}
                    </PillText>
                  </div>
                  <UiIcon name="arrow-right" className="ml-auto h-4 w-4 text-accent/50 transition-transform duration-150 group-hover:translate-x-0.5" />
                </div>
              </button>
            </div>
          )}

          {/* nvm found but no versions listed */}
          {state === "nvm-empty" && (
            <div className="space-y-3">
              <div className="rounded-[20px] border border-border/60 bg-bg px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-warning/25 bg-warning/10 text-warning">
                    <UiIcon name="warning-triangle" className="h-4 w-4" />
                  </div>
                  <div>
                    <BodyText className="font-semibold text-text">{t(translation.NodeVersionModal.NoVersionsFound)}</BodyText>
                    <BodyText className="mt-1 text-xs text-muted">
                      {t(translation.NodeVersionModal.NvmEmptyDesc)}
                    </BodyText>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={load}
                className="w-full rounded-[20px] border border-border bg-bg px-4 py-3 text-sm font-semibold text-muted transition-colors duration-150 hover:border-accent/30 hover:text-text"
              >
                {t(translation.GlobalTerm.Retry)}
              </button>
            </div>
          )}

          {/* Installing */}
          {state === "installing" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent">
                <UiIcon name="refresh-circle" className="h-6 w-6 animate-spin" />
              </div>
              <div className="text-center">
                <BodyText className="font-semibold text-text">{t(translation.NodeVersionModal.InstallingNvm)}</BodyText>
                <BodyText className="mt-1 text-xs text-muted">{t(translation.NodeVersionModal.InstallingNvmDesc)}</BodyText>
              </div>
            </div>
          )}

          {/* Install result */}
          {state === "install-done" && (
            <div className="space-y-3">
              <div
                className={clsx(
                  "rounded-[20px] border px-4 py-4",
                  installSuccess
                    ? "border-success/20 bg-success/5"
                    : "border-error/20 bg-error/5"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={clsx(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                      installSuccess
                        ? "border-success/25 bg-success/10 text-success"
                        : "border-error/25 bg-error/10 text-error"
                    )}
                  >
                    <UiIcon name={installSuccess ? "check-circle" : "warning-triangle"} className="h-4 w-4" />
                  </div>
                  <div>
                    <BodyText className={clsx("font-semibold", installSuccess ? "text-success" : "text-error")}>
                      {installSuccess ? t(translation.NodeVersionModal.NvmSuccess) : t(translation.NodeVersionModal.NvmFailed)}
                    </BodyText>
                    <BodyText className="mt-1 text-xs text-muted">
                      {installSuccess
                        ? t(translation.NodeVersionModal.NvmSuccessDesc)
                        : t(translation.NodeVersionModal.NvmFailedDesc)}
                    </BodyText>
                  </div>
                </div>
              </div>

              {installOutput && (
                <pre className="max-h-36 overflow-y-auto rounded-[16px] border border-border bg-bg px-4 py-3 font-mono text-[10px] leading-5 text-muted/70 whitespace-pre-wrap">
                  {installOutput}
                </pre>
              )}

              {installSuccess && (
                <button
                  type="button"
                  onClick={() => globalThis.lazify.relaunchApp()}
                  className="relative w-full overflow-hidden rounded-[20px] border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent transition-colors duration-150 hover:border-accent/50 hover:bg-accent/15"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={ACCENT_LINE} />
                  {t(translation.NodeVersionModal.RestartApp)}
                </button>
              )}
            </div>
          )}

          {/* Version list */}
          {state === "ready" && (
            <div className="max-h-[340px] space-y-1.5 overflow-y-auto pr-0.5">
              {versions.map((ver, i) => (
                <button
                  key={ver.version}
                  type="button"
                  onClick={() => setSelected(ver.version)}
                  className={clsx(
                    "group relative w-full overflow-hidden rounded-[18px] border px-4 py-3.5 text-left",
                    "animate-fadeIn opacity-0",
                    "transition-[border-color,background-color] duration-150",
                    selected === ver.version
                      ? "border-accent/30 bg-accent/8"
                      : "border-border bg-bg hover:border-accent/20"
                  )}
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  {selected === ver.version && (
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={ACCENT_LINE} />
                  )}

                  <div className="flex items-center gap-3">
                    <div
                      className={clsx(
                        "h-4 w-4 shrink-0 rounded-full border-2 transition-colors duration-150",
                        selected === ver.version
                          ? "border-accent bg-accent"
                          : "border-border bg-transparent group-hover:border-accent/50"
                      )}
                    />
                    <MonoText as="span" className="text-sm font-semibold text-text">{ver.version}</MonoText>

                    <div className="flex flex-1 items-center gap-1.5">
                      {ver.lts && (
                        <PillText as="span" className="rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-[9px] text-accent">
                          LTS · {ver.lts}
                        </PillText>
                      )}
                      {ver.current && (
                        <PillText as="span" className="rounded-full border border-border bg-soft px-2 py-0.5 text-[9px] text-muted">
                          Active
                        </PillText>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {state === "ready" && (
          <div className="border-t border-border px-6 py-4">
            <div className="mb-3 flex items-center gap-2">
              <OverlineText as="span" className="text-muted">{t(translation.GlobalTerm.Selected)}</OverlineText>
              <MonoText as="span" className="text-sm font-semibold text-accent">{selected}</MonoText>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={!!applying}
                className="rounded-[16px] border border-border bg-bg px-4 py-2.5 text-sm font-semibold text-muted transition-colors duration-150 hover:border-accent/30 hover:text-text disabled:opacity-50"
              >
                {t(translation.GlobalTerm.Cancel)}
              </button>
              <div className="flex flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={handleUseSession}
                  disabled={!selected || !!applying}
                  className={clsx(
                    "flex-1 rounded-[16px] border border-transparent bg-accent px-4 py-2.5",
                    "text-sm font-semibold text-bg",
                    "transition-[background-color,opacity] duration-150 hover:bg-accentHover",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  {t(translation.NodeVersionModal.UseOnce)}
                </button>
                <button
                  type="button"
                  onClick={handleSetDefault}
                  disabled={!selected || !!applying}
                  className={clsx(
                    "relative flex-1 overflow-hidden rounded-[16px] border border-accent/25 bg-transparent px-4 py-2.5",
                    "text-sm font-semibold text-accent/80",
                    "transition-colors duration-150 hover:border-accent/50 hover:bg-accent/10 hover:text-accent",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  {applying === "default" ? (
                    <Typography as="span" variant="body" className="flex items-center justify-center gap-2 text-inherit">
                      <UiIcon name="refresh-circle" className="h-3.5 w-3.5 animate-spin" />
                      {t(translation.NodeVersionModal.Applying)}
                    </Typography>
                  ) : (
                    t(translation.NodeVersionModal.SetAsDefault)
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BaseModal>
  );
}
