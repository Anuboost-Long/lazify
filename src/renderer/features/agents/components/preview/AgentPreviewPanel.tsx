import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { usePictureInPicture } from "@renderer/shared/hooks/use-picture-in-picture";
import { toggleMediaPictureInPicture } from "@renderer/shared/lib/media-pip";
import { MonoText, SmallText } from "@renderer/shared/typography";
import { Control } from "./PreviewControl";
import { normalizePreviewUrl } from "./preview-url";

const PREVIEW_PARTITION = "persist:lazify-preview";


interface AgentPreviewPanelProps {
  detectedUrl: string | null;

  isRunning: boolean;

  visible: boolean;
}

export function AgentPreviewPanel({
  detectedUrl,
  isRunning,
  visible
}: Readonly<AgentPreviewPanelProps>) {
  const { t } = useTranslation();
  const viewRef = useRef<LazifyWebviewElement | null>(null);

  const [target, setTarget] = useState<string | null>(null);

  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  const [rejected, setRejected] = useState(false);

  const [pipNotice, setPipNotice] = useState<string | null>(null);
  const pagePip = usePictureInPicture("preview");
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const [ready, setReady] = useState(false);

  const initialSrc = useRef<string | null>(null);
  if (target && !initialSrc.current) initialSrc.current = target;

  const lastDetected = useRef<string | null>(null);
  useEffect(() => {
    if (!detectedUrl || detectedUrl === lastDetected.current) return;
    lastDetected.current = detectedUrl;
    setTarget(detectedUrl);
    setAddress(detectedUrl);
    setFailedUrl(null);
  }, [detectedUrl]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || !ready || !target) return;

    try {
      if (view.getURL() === target) return;
      void view.loadURL(target).catch(() => setFailedUrl(target));
    } catch {
      setFailedUrl(target);
    }
  }, [ready, target]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const syncHistory = () => {
      try {
        setCanGoBack(view.canGoBack());
        setCanGoForward(view.canGoForward());
      } catch {
        setCanGoBack(false);
        setCanGoForward(false);
      }
    };
    const onReady = () => {
      setReady(true);
      syncHistory();
    };
    const onNavigate = () => {
      try {
        setAddress(view.getURL());
      } catch {
        return;
      }
      setFailedUrl(null);
      syncHistory();
    };
    const onStart = () => setLoading(true);
    const onStop = () => {
      setLoading(false);
      syncHistory();
    };
    const onFail = (event: Event) => {
      const { errorCode, validatedURL, isMainFrame } = event as Event & {
        errorCode?: number;
        validatedURL?: string;
        isMainFrame?: boolean;
      };

      if (isMainFrame === false) return;

      if (errorCode === -3) return;

      setFailedUrl(validatedURL ?? target);
      setLoading(false);
    };

    view.addEventListener("dom-ready", onReady);
    view.addEventListener("did-start-loading", onStart);
    view.addEventListener("did-stop-loading", onStop);
    view.addEventListener("did-navigate", onNavigate);
    view.addEventListener("did-navigate-in-page", onNavigate);
    view.addEventListener("did-fail-load", onFail);

    return () => {
      view.removeEventListener("dom-ready", onReady);
      view.removeEventListener("did-start-loading", onStart);
      view.removeEventListener("did-stop-loading", onStop);
      view.removeEventListener("did-navigate", onNavigate);
      view.removeEventListener("did-navigate-in-page", onNavigate);
      view.removeEventListener("did-fail-load", onFail);
    };
  }, [target]);

  const drive = useCallback(
    (action: (view: LazifyWebviewElement) => void) => {
      const view = viewRef.current;
      if (!view || !ready) return;
      try {
        action(view);
      } catch {
      }
    },
    [ready]
  );

  const submitAddress = (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = normalizePreviewUrl(address);

    if (!normalized) {
      setRejected(true);
      return;
    }

    setRejected(false);
    setFailedUrl(null);

    if (normalized === target) drive((view) => view.reload());
    else setTarget(normalized);
  };

  const reload = useCallback(() => {
    setFailedUrl(null);
    drive((view) => view.reload());
  }, [drive]);

  const placeholder = (() => {
    if (failedUrl) return t(translation.Agents.PreviewFailed, { url: failedUrl });
    if (!isRunning) return t(translation.Agents.PreviewNoRun);
    return t(translation.Agents.PreviewWaiting);
  })();

  return (
    <div
      aria-hidden={!visible}
      className={clsx(
        "flex min-h-0 min-w-0 flex-col overflow-hidden",
        "bg-text/[0.02]",
        visible ? "flex-1" : "pointer-events-none absolute inset-0"
      )}
      style={visible ? undefined : { visibility: "hidden" }}
    >
      <form
        onSubmit={submitAddress}
        className="flex items-center gap-0.5 border-b border-border px-1.5 py-1.5"
      >
        <Control
          icon="arrow-left"
          label={t(translation.GlobalTerm.Back)}
          disabled={!canGoBack}
          onClick={() => drive((view) => view.goBack())}
        />
        <Control
          icon="arrow-right"
          label={t(translation.Agents.PreviewForward)}
          disabled={!canGoForward}
          onClick={() => drive((view) => view.goForward())}
        />
        <Control
          icon={loading ? "xmark" : "refresh-circle"}
          label={t(loading ? translation.Agents.PreviewStop : translation.GlobalTerm.Refresh)}
          disabled={!target || !ready}
          onClick={() => (loading ? drive((view) => view.stop()) : reload())}
        />

        <input
          value={address}
          onChange={(event) => {
            setAddress(event.target.value);
            setRejected(false);
          }}
          spellCheck={false}
          placeholder={t(translation.Agents.PreviewAddressPlaceholder)}
          aria-label={t(translation.Agents.PreviewAddress)}
          aria-invalid={rejected}
          className={clsx(
            "min-w-0 flex-1 rounded-lg border bg-soft px-2.5 py-1",
            "font-mono text-[11px] text-text outline-none transition-colors",
            "placeholder:text-muted focus:border-accent",
            rejected ? "border-error" : "border-black/[0.06] dark:border-white/[0.06]"
          )}
        />

        <Control
          icon="multi-window"
          label={t(translation.Agents.PreviewPipMedia)}
          disabled={!target || !ready}
          onClick={() => {
            const view = viewRef.current;
            if (!view) return;

            setPipNotice(null);
            void toggleMediaPictureInPicture(view).then((result) => {
              if (result === "none") setPipNotice(t(translation.Agents.PreviewPipNoMedia));
              else if (result === "unsupported") {
                setPipNotice(t(translation.Agents.PreviewPipUnsupported));
              }
            });
          }}
        />
        <Control
          icon="media-video"
          label={t(
            pagePip.open
              ? translation.Agents.PreviewPipPageClose
              : translation.Agents.PreviewPipPage
          )}
          active={pagePip.open}
          disabled={!target}
          onClick={() => {
            setPipNotice(null);

            void pagePip.toggle(normalizePreviewUrl(address) ?? target);
          }}
        />

        <Control
          icon="bug"
          label={t(translation.Agents.PreviewDevtools)}
          disabled={!target || !ready}
          onClick={() =>
            drive((view) =>
              view.isDevToolsOpened() ? view.closeDevTools() : view.openDevTools()
            )
          }
        />

        <Control
          icon="open-new-window"
          label={t(translation.Agents.PreviewOpenExternal)}
          disabled={!target}
          onClick={() => {
            if (target) void globalThis.lazify.openExternalUrl(address || target);
          }}
        />
      </form>

      {rejected ? (
        <SmallText className="!text-error border-b border-border px-3 py-1.5">
          {t(translation.Agents.PreviewBlocked)}
        </SmallText>
      ) : null}

      {pipNotice ? (
        <SmallText className="!text-muted border-b border-border px-3 py-1.5">
          {pipNotice}
        </SmallText>
      ) : null}

      <div className="relative min-h-0 flex-1">
        {target ? (
          <webview
            ref={viewRef as React.Ref<HTMLElement>}
            src={initialSrc.current ?? undefined}

            webpreferences="backgroundThrottling=no"
            partition={PREVIEW_PARTITION}

            className="absolute inset-0 flex bg-white"
          />
        ) : null}

        {target && !failedUrl ? null : (
          <div className="absolute inset-0 flex items-center justify-center bg-soft px-6">
            <MonoText className="text-center text-[11px] text-muted">{placeholder}</MonoText>
          </div>
        )}
      </div>
    </div>
  );
}

