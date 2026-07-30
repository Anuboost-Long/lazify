import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { CaptionText, MonoText, SectionTitle, SmallText } from "@renderer/shared/typography";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import { ConfirmModal } from "@renderer/shared/ui/modal/ConfirmModal";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

type ListeningProcess = Awaited<ReturnType<typeof globalThis.lazify.listListeningProcesses>>[number];

/**
 * Everything listening on this machine, and a way to end it.
 *
 * The answer to "port 3000 is already in use" — which otherwise means leaving
 * the app for `lsof` and `kill`. Lazify's own processes are listed but locked,
 * so the panel is never the reason the window disappears.
 */

/** Ports below this are the system's business, not a dev server's. */
const SYSTEM_PORT_CEILING = 1024;

export function PortReaperSection() {
  const { t } = useTranslation();
  const [processes, setProcesses] = useState<ListeningProcess[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<ListeningProcess | null>(null);
  const [killing, setKilling] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(
    null
  );
  const [showSystem, setShowSystem] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setProcesses(await globalThis.lazify.listListeningProcesses());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const confirmKill = async () => {
    if (!pending) return;
    setKilling(true);
    try {
      const result = await globalThis.lazify.killListeningProcess(pending.pid);
      setFeedback({ tone: result.success ? "success" : "error", message: result.message });
      await refresh();
    } finally {
      setKilling(false);
      setPending(null);
    }
  };

  const visible = (processes ?? []).filter(
    (entry) => showSystem || entry.port >= SYSTEM_PORT_CEILING
  );
  const hiddenCount = (processes ?? []).length - visible.length;

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center gap-2">
        <SectionTitle className="min-w-0 flex-1">
          {t(translation.PortReaper.Title)}
        </SectionTitle>

        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className={clsx(
            "group inline-flex items-center gap-1.5 rounded-[8px] border border-border bg-bg px-3 py-1",
            "text-xs font-semibold text-muted",
            "hover:border-accent hover:text-text",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
        >
          <UiIcon
            name="refresh-circle"
            className={clsx("h-3.5 w-3.5 group-hover:text-accent", loading && "animate-spin")}
          />
          {t(translation.GlobalTerm.Refresh)}
        </button>
      </div>

      <CaptionText tone="muted">{t(translation.PortReaper.Description)}</CaptionText>

      {feedback ? (
        <div
          className={clsx(
            "flex items-center gap-2 rounded-xl border px-3 py-2",
            feedback.tone === "success"
              ? "border-accent/30 bg-accent/[0.06]"
              : "border-error/30 bg-error/[0.06]"
          )}
        >
          <SmallText className={feedback.tone === "success" ? "!text-accent" : "!text-error"}>
            {feedback.message}
          </SmallText>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="ml-auto text-muted hover:text-text"
            aria-label={t(translation.GlobalTerm.Dismiss)}
          >
            <UiIcon name="xmark" className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {visible.length === 0 ? (
        <CaptionText tone="muted">
          {loading ? t(translation.GlobalTerm.Scanning) : t(translation.PortReaper.Empty)}
        </CaptionText>
      ) : (
        <div className="flex flex-col gap-1.5">
          {visible.map((entry) => (
            <div
              key={`${entry.pid}:${entry.port}`}
              className={clsx(
                "flex min-w-0 items-center gap-3 overflow-hidden",
                "rounded-xl border border-border bg-soft px-3 py-2"
              )}
            >
              {/* The port is what the user came here for, so it leads. */}
              <MonoText as="span" className="w-16 shrink-0 text-sm text-accent">
                {entry.port}
              </MonoText>

              <div className="min-w-0 flex-1">
                {/* min-w-0 on every flex level, or the command line below sets
                    the row's width and the whole page scrolls sideways. */}
                <div className="flex min-w-0 items-center gap-1.5">
                  <SmallText className="!text-text min-w-0 truncate">{entry.command}</SmallText>
                  <MonoText as="span" className="shrink-0 text-[10px] text-muted">
                    {entry.pid}
                  </MonoText>

                  {entry.isProtected ? (
                    <span className="shrink-0 rounded-full border border-border px-1.5 text-[10px] text-muted">
                      {t(translation.PortReaper.BadgeLazify)}
                    </span>
                  ) : null}
                  {entry.isManaged ? (
                    <span className="shrink-0 rounded-full border border-accent/30 bg-accent/10 px-1.5 text-[10px] text-accent">
                      {t(translation.PortReaper.BadgeManaged)}
                    </span>
                  ) : null}
                </div>
                <CaptionText tone="muted" className="mt-0.5 block truncate !text-[10px]">
                  {entry.commandLine}
                </CaptionText>
              </div>

              {/* The disabled case is the one that needs explaining: a protected
                  row is Lazify's own process, and the tooltip is where that is
                  said. */}
              <Tooltip
                side="top"
                content={
                  entry.isProtected
                    ? t(translation.PortReaper.ProtectedHint)
                    : t(translation.PortReaper.Kill)
                }
              >
                <button
                  type="button"
                  disabled={entry.isProtected}
                  onClick={() => setPending(entry)}
                  aria-label={t(translation.PortReaper.Kill)}
                  className={clsx(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
                    entry.isProtected
                      ? "cursor-not-allowed border-border text-muted opacity-40"
                      : "border-error/30 text-error hover:bg-error/[0.08]"
                  )}
                >
                  <UiIcon name="stop-circle" className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
            </div>
          ))}
        </div>
      )}

      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => setShowSystem(true)}
          className="self-start text-xs text-muted hover:text-text"
        >
          {t(translation.PortReaper.ShowSystem, { count: hiddenCount })}
        </button>
      ) : null}

      <ConfirmModal
        open={pending !== null}
        title={t(translation.PortReaper.ConfirmTitle)}
        description={t(
          pending?.isManaged
            ? translation.PortReaper.ConfirmManagedDesc
            : translation.PortReaper.ConfirmDesc,
          { port: pending?.port ?? 0, command: pending?.command ?? "" }
        )}
        confirmLabel={killing ? t(translation.GlobalTerm.Loading) : t(translation.PortReaper.Kill)}
        destructive
        onConfirm={() => void confirmKill()}
        onCancel={() => setPending(null)}
      />
    </section>
  );
}
