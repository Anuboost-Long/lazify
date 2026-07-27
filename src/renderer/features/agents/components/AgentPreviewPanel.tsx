import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { usePictureInPicture } from "@renderer/shared/hooks/use-picture-in-picture";
import { toggleMediaPictureInPicture } from "@renderer/shared/lib/media-pip";
import { MonoText, SmallText } from "@renderer/shared/typography";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";

/** Cookies and storage stay out of the app's own session, and survive restarts. */
const PREVIEW_PARTITION = "persist:lazify-preview";

/** Hosts the preview will load. Everything else leaves for the real browser. */
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);

/**
 * Turns what the user typed into a URL the preview can load, or null when it is
 * not a localhost address. A bare `3000` or `localhost:3000` is the common case,
 * so the scheme is filled in rather than demanded.
 */
export function normalizePreviewUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `http://${/^\d{2,5}$/.test(trimmed) ? `localhost:${trimmed}` : trimmed}`;

  try {
    const url = new URL(withScheme);
    const host = url.hostname.toLowerCase();
    if (!LOOPBACK_HOSTS.has(host) && !host.endsWith(".localhost")) return null;
    return url.href;
  } catch {
    return null;
  }
}

interface AgentPreviewPanelProps {
  /** Address the running script was detected on, or null when there is none. */
  detectedUrl: string | null;
  /** True while the project's script is live, which drives the empty states. */
  isRunning: boolean;
  /** False while another tab is showing — the page keeps running. */
  visible: boolean;
}

interface ControlProps {
  icon: UiIconName;
  label: string;
  disabled?: boolean;
  /** Held-down look for controls that toggle something that stays on. */
  active?: boolean;
  onClick: () => void;
}

/** One toolbar button, sized to match the debug panel's control strip. */
function Control({
  icon,
  label,
  disabled = false,
  active = false,
  onClick
}: Readonly<ControlProps>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={clsx(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
        disabled
          ? "cursor-not-allowed text-muted opacity-40"
          : "text-text hover:bg-text/[0.06]",
        active && !disabled && "bg-accent/15 !text-accent"
      )}
    >
      <UiIcon name={icon} className="h-3.5 w-3.5" />
    </button>
  );
}

/**
 * A browser for whatever the project is serving on localhost, living in its own
 * tab beside the agent terminals so an edit and its result are one click apart.
 *
 * The page runs in an isolated `<webview>`, which the main process locks to
 * loopback — this component only has to keep the toolbar honest.
 *
 * Switching to another tab hides this panel instead of unmounting it, so the
 * page the user had navigated to — and its scroll, its form state, its session —
 * is still there when they come back. Only closing the preview tab, which
 * unmounts the panel outright, tears the guest down.
 */
export function AgentPreviewPanel({
  detectedUrl,
  isRunning,
  visible
}: Readonly<AgentPreviewPanelProps>) {
  const { t } = useTranslation();
  const viewRef = useRef<LazifyWebviewElement | null>(null);

  /** The URL we have asked the guest to load. */
  const [target, setTarget] = useState<string | null>(null);
  /** What the address bar shows — follows the guest, and the user's typing. */
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  /** Set when the address bar is given something that is not localhost. */
  const [rejected, setRejected] = useState(false);
  /** Explains a picture-in-picture request the page could not answer. */
  const [pipNotice, setPipNotice] = useState<string | null>(null);
  const pagePip = usePictureInPicture("preview");
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  /**
   * The guest is not usable the moment React mounts the tag — every method on
   * it throws until Electron has attached it and fired `dom-ready`. Nothing
   * below may touch the guest while this is false.
   */
  const [ready, setReady] = useState(false);

  // The tag's `src` is written once, at mount. Every later navigation goes
  // through loadURL, so React re-renders never reload the page underneath the
  // user — including the re-render caused by the guest's own navigation.
  const initialSrc = useRef<string | null>(null);
  if (target && !initialSrc.current) initialSrc.current = target;

  // Follows the dev server, but only when it actually moves. A restart onto a
  // new port is worth jumping to; the same port polled every two seconds is not,
  // or the user would be yanked back to `/` from wherever they browsed to.
  const lastDetected = useRef<string | null>(null);
  useEffect(() => {
    if (!detectedUrl || detectedUrl === lastDetected.current) return;
    lastDetected.current = detectedUrl;
    setTarget(detectedUrl);
    setAddress(detectedUrl);
    setFailedUrl(null);
  }, [detectedUrl]);

  // Drives the guest, once it can actually be driven. Skipped when it is
  // already there, so re-entering the effect after an in-page navigation does
  // not reload — and the first load needs nothing here at all, since the tag
  // mounts with its `src` already set.
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !ready || !target) return;

    try {
      if (view.getURL() === target) return;
      void view.loadURL(target).catch(() => setFailedUrl(target));
    } catch {
      // Detached mid-flight — the next dom-ready brings it back.
      setFailedUrl(target);
    }
  }, [ready, target]);

  // The guest reports its own state through DOM events, so the toolbar tracks
  // navigation the page does on its own — links, redirects, router pushes.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    // Every read below can throw if the guest detaches between the event and
    // this handler, and an uncaught throw here would take the app's whole tree
    // down with it.
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
      // A broken iframe or asset inside a page that otherwise loaded is the
      // page's problem to show, not grounds for covering it.
      if (isMainFrame === false) return;
      // Aborted loads are what a fast redirect looks like, not a failure.
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
    // Bound once the tag exists, and re-bound per target so the failure
    // handler never reports a stale address.
  }, [target]);

  /**
   * Runs a command against the guest. Every one of its methods throws while it
   * is detached, and an uncaught throw from a click handler unmounts the app,
   * so nothing calls the guest directly.
   */
  const drive = useCallback(
    (action: (view: LazifyWebviewElement) => void) => {
      const view = viewRef.current;
      if (!view || !ready) return;
      try {
        action(view);
      } catch {
        // The guest is gone; its own events will resync the toolbar.
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
    // Re-submitting the same address is a reload, which a state change alone
    // would not deliver.
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
    // A tab body: it takes the terminal's place in the row while its tab is the
    // active one, so any open side rail keeps its width. Hidden by stepping out
    // of the flex flow rather than out of the tree, and with `visibility` rather
    // than `display`, so the guest stays laid out at its real size and coming
    // back costs no reflow of the page inside it.
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

        {/* Two kinds of picture in picture, because a video and a page are not
            the same problem. The video goes to the OS player, which floats over
            everything including other apps; the page goes to a small always-on-
            top window of our own. */}
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
            // Normalized, not raw: the address bar may hold half-typed text, and
            // main will refuse anything that is not loopback.
            void pagePip.toggle(normalizePreviewUrl(address) ?? target);
          }}
        />

        {/* Chromium's own devtools, in their own window — console, network and
            a real JS debugger, without spending a pixel of the pane on them. */}
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

      {/* A deliberate button press that could not be honoured says why; it
          clears on the next press rather than on a timer. */}
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
            // Hiding the panel occludes the guest, and Chromium freezes an
            // occluded guest's timers — which would stall the dev server's own
            // HMR client while the user is on another tab.
            webpreferences="backgroundThrottling=no"
            partition={PREVIEW_PARTITION}
            // The tag defaults to inline, which collapses it to nothing.
            className="absolute inset-0 flex bg-white"
          />
        ) : null}

        {/* Covers the guest while there is nothing to show — including a failed
            load, where the guest is showing Chromium's own error page. */}
        {target && !failedUrl ? null : (
          <div className="absolute inset-0 flex items-center justify-center bg-soft px-6">
            <MonoText className="text-center text-[11px] text-muted">{placeholder}</MonoText>
          </div>
        )}
      </div>
    </div>
  );
}
