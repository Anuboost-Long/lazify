import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { DetectedTool, ToolUpdateInfo } from "@renderer/shared/types/lazify";

interface UpdateToolModalProps {
  tool: DetectedTool | null;
  updateInfo: ToolUpdateInfo | null;
  open: boolean;
  onClose: () => void;
  onUpdated: (toolName: string) => void;
}

type UpdateState = "result" | "updating" | "done";

const ACCENT_LINE = {
  background: "linear-gradient(to right, transparent, var(--color-accent), transparent)",
  opacity: 0.55,
} as const;

export function UpdateToolModal({ tool, updateInfo, open, onClose, onUpdated }: UpdateToolModalProps) {
  const [state, setState] = useState<UpdateState>("result");
  const [output, setOutput] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setState("result");
      setOutput("");
      setSuccess(false);
    }
  }, [open]);

  const handleUpdate = useCallback(async () => {
    if (!tool) return;
    setState("updating");
    const result = await window.lazify.updateTool(tool.name);
    setOutput(result.output);
    setSuccess(result.success);
    setState("done");
  }, [tool]);

  const norm = (v: string | null) => v?.replace(/^v/, "") ?? null;
  const hasUpdate = updateInfo?.hasUpdate ?? false;

  return (
    <BaseModal open={open} onClose={state === "updating" ? undefined : onClose} cancellable={state !== "updating"}>
      <div className="w-[440px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-shell border border-border bg-soft shadow-panel">

        {/* Header */}
        <div className="relative overflow-hidden border-b border-border px-6 py-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={ACCENT_LINE} />
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">
                {hasUpdate ? "Update available" : "Up to date"}
              </p>
              <h3 className="mt-1 font-display text-2xl text-text">{tool?.displayName}</h3>
            </div>
            {state !== "updating" && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border bg-bg p-2 text-muted transition-colors duration-150 hover:border-accent/30 hover:text-text"
              >
                <UiIcon name="xmark" className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-6">

          {/* Result: up to date */}
          {state === "result" && !hasUpdate && (
            <div className="flex items-start gap-3 rounded-[20px] border border-success/20 bg-success/5 px-4 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-success/25 bg-success/10 text-success">
                <UiIcon name="check-circle" className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-success">Already up to date</p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {tool?.displayName}
                  {norm(tool?.version ?? null) ? ` (${norm(tool?.version ?? null)})` : ""} is the latest version.
                </p>
              </div>
            </div>
          )}

          {/* Result: update available */}
          {state === "result" && hasUpdate && tool && (
            <div className="space-y-4">
              <div className="rounded-[20px] border border-accent/20 bg-accent/5 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent">
                    <UiIcon name="activity" className="h-4 w-4" />
                  </div>
                  <div className="flex flex-1 items-center gap-2">
                    <span className="rounded-full border border-border bg-bg px-2.5 py-0.5 font-mono text-[10px] font-semibold text-muted">
                      {norm(tool.version) ?? "current"}
                    </span>
                    <UiIcon name="arrow-right" className="h-3 w-3 shrink-0 text-muted/50" />
                    <span className="rounded-full border border-accent/25 bg-accent/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-accent">
                      {updateInfo?.latestVersion ? norm(updateInfo.latestVersion) : "latest"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-[16px] border border-border bg-bg px-4 py-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Command</p>
                <code className="break-all font-mono text-sm text-accent">{tool.updateCommand}</code>
              </div>
            </div>
          )}

          {/* Updating */}
          {state === "updating" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent">
                <UiIcon name="refresh-circle" className="h-6 w-6 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-text">Updating {tool?.displayName}…</p>
                <p className="mt-1 text-xs text-muted">This may take a moment.</p>
              </div>
            </div>
          )}

          {/* Done */}
          {state === "done" && (
            <div className="space-y-3">
              <div className={clsx(
                "rounded-[20px] border px-4 py-4",
                success ? "border-success/20 bg-success/5" : "border-error/20 bg-error/5"
              )}>
                <div className="flex items-start gap-3">
                  <div className={clsx(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                    success ? "border-success/25 bg-success/10 text-success" : "border-error/25 bg-error/10 text-error"
                  )}>
                    <UiIcon name={success ? "check-circle" : "warning-triangle"} className="h-4 w-4" />
                  </div>
                  <div>
                    <p className={clsx("text-sm font-semibold", success ? "text-success" : "text-error")}>
                      {success ? `${tool?.displayName} updated` : "Update failed"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      {success ? "The environment has been refreshed." : "Check the output below for details."}
                    </p>
                  </div>
                </div>
              </div>
              {output && (
                <pre className="max-h-40 overflow-y-auto rounded-[16px] border border-border bg-bg px-4 py-3 font-mono text-[10px] leading-5 text-muted/70 whitespace-pre-wrap">
                  {output}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          {state === "result" && hasUpdate && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-[16px] border border-border bg-bg px-4 py-2.5 text-sm font-semibold text-muted transition-colors duration-150 hover:border-accent/30 hover:text-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdate}
                className="rounded-[16px] border border-transparent bg-accent px-5 py-2.5 text-sm font-semibold text-bg transition-[background-color] duration-150 hover:bg-accentHover"
              >
                Update
              </button>
            </>
          )}

          {((state === "result" && !hasUpdate) || state === "done") && (
            <button
              type="button"
              onClick={state === "done" && success ? () => { onUpdated(tool!.name); onClose(); } : onClose}
              className="rounded-[16px] border border-transparent bg-accent px-5 py-2.5 text-sm font-semibold text-bg transition-[background-color] duration-150 hover:bg-accentHover"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </BaseModal>
  );
}
