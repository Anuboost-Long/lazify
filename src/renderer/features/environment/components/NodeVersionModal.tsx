import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { NvmNodeVersion } from "@renderer/shared/types/lazify";

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
  const [state, setState] = useState<ModalState>("loading");
  const [versions, setVersions] = useState<NvmNodeVersion[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [installOutput, setInstallOutput] = useState("");
  const [installSuccess, setInstallSuccess] = useState(false);
  const [applying, setApplying] = useState<"session" | "default" | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    const result = await window.lazify.nvmListVersions();
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
    const result = await window.lazify.installNvm();
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
    await window.lazify.nvmSetDefault(selected);
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
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">Runtime</p>
              <h3 className="mt-1 font-display text-2xl text-text">Node Versions</h3>
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
              Scanning nvm…
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
                    <p className="text-sm font-semibold text-text">nvm is not installed</p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      Node Version Manager lets you install and switch between multiple Node.js versions with a single command.
                    </p>
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
                    <p className="text-sm font-semibold text-accent">Install nvm</p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent/60">
                      Official install script · auto-configures shell
                    </p>
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
                    <p className="text-sm font-semibold text-text">No Node versions found</p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      nvm is installed but reported no versions. Try installing one with{" "}
                      <code className="rounded bg-soft px-1 py-0.5 font-mono text-accent">nvm install --lts</code> in your terminal.
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={load}
                className="w-full rounded-[20px] border border-border bg-bg px-4 py-3 text-sm font-semibold text-muted transition-colors duration-150 hover:border-accent/30 hover:text-text"
              >
                Retry
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
                <p className="text-sm font-semibold text-text">Installing nvm…</p>
                <p className="mt-1 text-xs text-muted">Running the official install script. This may take a moment.</p>
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
                    <p className={clsx("text-sm font-semibold", installSuccess ? "text-success" : "text-error")}>
                      {installSuccess ? "nvm installed successfully" : "Installation failed"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      {installSuccess
                        ? "Restart the app to start using nvm and manage Node.js versions."
                        : "Check the output below and try again."}
                    </p>
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
                  onClick={() => window.lazify.relaunchApp()}
                  className="relative w-full overflow-hidden rounded-[20px] border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent transition-colors duration-150 hover:border-accent/50 hover:bg-accent/15"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={ACCENT_LINE} />
                  Restart App
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
                    <span className="font-mono text-sm font-semibold text-text">{ver.version}</span>

                    <div className="flex flex-1 items-center gap-1.5">
                      {ver.lts && (
                        <span className="rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-accent">
                          LTS · {ver.lts}
                        </span>
                      )}
                      {ver.current && (
                        <span className="rounded-full border border-border bg-soft px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-muted">
                          Active
                        </span>
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
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Selected</span>
              <span className="font-mono text-sm font-semibold text-accent">{selected}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={!!applying}
                className="rounded-[16px] border border-border bg-bg px-4 py-2.5 text-sm font-semibold text-muted transition-colors duration-150 hover:border-accent/30 hover:text-text disabled:opacity-50"
              >
                Cancel
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
                  Use once
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
                    <span className="flex items-center justify-center gap-2">
                      <UiIcon name="refresh-circle" className="h-3.5 w-3.5 animate-spin" />
                      Applying…
                    </span>
                  ) : (
                    "Set as default"
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
