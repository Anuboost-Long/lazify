import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { usePictureInPicture } from "@renderer/shared/hooks/use-picture-in-picture";
import { toggleMediaPictureInPicture } from "@renderer/shared/lib/media-pip";
import { SmallText } from "@renderer/shared/typography";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import { IconButton } from "@renderer/shared/ui/IconButton";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";
import { BrowserGuest, type GuestStatus } from "./BrowserGuest";
import { BrowserStartPage } from "./BrowserStartPage";
import { LazyShieldPanel } from "./LazyShieldPanel";
import { SendToAgentButton } from "./SendToAgentButton";
import { useBrowserTabs, type BrowserTab } from "../hooks/use-browser-tabs";
import { useLazyShield } from "../hooks/use-lazy-shield";
import { tabLabel } from "../lib/browser-url";

const EMPTY_STATUS: GuestStatus = {
  ready: false,
  loading: false,
  canGoBack: false,
  canGoForward: false
};

interface ControlProps {
  icon: UiIconName;
  label: string;
  disabled?: boolean;
  /** Held-down look for controls that toggle something that stays on. */
  active?: boolean;
  onClick: () => void;
}

function Control({
  icon,
  label,
  disabled = false,
  active = false,
  onClick
}: Readonly<ControlProps>) {
  return (
    <Tooltip content={label} side="bottom">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={active}
        className={clsx(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
          disabled ? "cursor-not-allowed text-muted opacity-40" : "text-text hover:bg-text/[0.06]",
          active && !disabled && "bg-accent/15 !text-accent"
        )}
      >
        <UiIcon name={icon} className="h-3.5 w-3.5" />
      </button>
    </Tooltip>
  );
}

interface BrowserSurfaceProps {
  /** False while the user is on another page — it keeps running regardless. */
  visible: boolean;
}

/**
 * The browser page's whole surface, mounted by the shell rather than the route.
 *
 * Being mounted by the shell is the feature: navigating to Agents moves this
 * off-screen instead of unmounting it, so whatever is playing keeps playing.
 * Nothing here may unmount a guest for a reason short of closing its tab.
 */
export function BrowserSurface({ visible }: Readonly<BrowserSurfaceProps>) {
  const { t } = useTranslation();
  const {
    tabs,
    activeTab,
    activeId,
    setActiveId,
    openTab,
    closeTab,
    reorderTab,
    patchTab,
    navigateActive
  } = useBrowserTabs();

  const shield = useLazyShield();
  const pagePip = usePictureInPicture("browser");
  const [statuses, setStatuses] = useState<Record<string, GuestStatus>>({});
  /** Explains a picture-in-picture request the page could not answer. */
  const [pipNotice, setPipNotice] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  /** True while the user is editing, so the guest does not overwrite them. */
  const editingRef = useRef(false);
  /** Tab being dragged in the strip, and the one it would drop onto. */
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const endDrag = () => {
    setDraggingId(null);
    setDropTargetId(null);
  };

  /**
   * The order the guests are rendered in, which is deliberately NOT the strip's.
   *
   * Reordering a keyed list makes React move the DOM nodes, and moving a
   * <webview> detaches it — the page reloads and whatever it was playing stops.
   * Guests are absolutely positioned and stacked by z-index, so their order is
   * invisible anyway: each one keeps the slot it first mounted in for as long
   * as its tab exists, however the strip above is rearranged.
   */
  const guestOrder = useRef<string[]>([]);
  for (const tab of tabs) {
    if (!guestOrder.current.includes(tab.id)) guestOrder.current.push(tab.id);
  }
  guestOrder.current = guestOrder.current.filter((id) =>
    tabs.some((tab) => tab.id === id)
  );
  const guestTabs = guestOrder.current
    .map((id) => tabs.find((tab) => tab.id === id))
    .filter((tab): tab is BrowserTab => Boolean(tab?.url));

  const views = useRef(new Map<string, LazifyWebviewElement>());
  const registerView = useCallback((tabId: string, view: LazifyWebviewElement | null) => {
    if (view) views.current.set(tabId, view);
    else views.current.delete(tabId);
  }, []);

  const handleStatus = useCallback((tabId: string, patch: Partial<GuestStatus>) => {
    setStatuses((current) => ({
      ...current,
      [tabId]: { ...(current[tabId] ?? EMPTY_STATUS), ...patch }
    }));
  }, []);

  const handleNavigate = useCallback(
    (tabId: string, url: string, title: string) => {
      patchTab(tabId, { currentUrl: url, ...(title ? { title } : {}) });
    },
    [patchTab]
  );

  const status = statuses[activeId] ?? EMPTY_STATUS;

  // The bar follows the active tab unless the user is mid-edit.
  useEffect(() => {
    if (editingRef.current) return;
    setAddress(activeTab?.currentUrl ?? "");
  }, [activeTab?.currentUrl, activeId, activeTab]);

  /** Runs a command against the active guest; every method throws when detached. */
  const drive = useCallback(
    (action: (view: LazifyWebviewElement) => void) => {
      const view = views.current.get(activeId);
      if (!view || !status.ready) return;
      try {
        action(view);
      } catch {
        // Its own events will resync the toolbar.
      }
    },
    [activeId, status.ready]
  );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    editingRef.current = false;
    navigateActive(address);
  };

  return (
    <div
      aria-hidden={!visible}
      className={clsx(
        "absolute inset-x-0 bottom-0 top-0 z-20 flex flex-col bg-bg",
        !visible && "pointer-events-none"
      )}
      // Hidden rather than unmounted or removed from layout, so Chromium marks
      // the guests occluded and stops painting them while media keeps running.
      // Each guest re-checks this for itself; see the note in BrowserGuest.
      style={visible ? undefined : { visibility: "hidden" }}
    >
      {/* Tab strip */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border px-2 py-1.5">
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeId;
          const isDragging = tab.id === draggingId;
          const isDropTarget = tab.id === dropTargetId && !isDragging;
          // The insertion line sits on the edge the tab would arrive from.
          const draggingIndex = tabs.findIndex((candidate) => candidate.id === draggingId);
          const dropsAfter = draggingIndex !== -1 && draggingIndex < index;

          return (
            <div
              key={tab.id}
              draggable
              onDragStart={(event) => {
                setDraggingId(tab.id);
                event.dataTransfer.effectAllowed = "move";
                // Firefox refuses to start a drag without payload.
                event.dataTransfer.setData("text/plain", tab.id);
              }}
              onDragOver={(event) => {
                if (!draggingId) return;
                // Preventing the default is what marks this a valid drop target.
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDropTargetId(tab.id);
              }}
              onDragLeave={() => {
                setDropTargetId((current) => (current === tab.id ? null : current));
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (draggingId) reorderTab(draggingId, tab.id);
                endDrag();
              }}
              onDragEnd={endDrag}
              className={clsx(
                "relative flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5",
                "cursor-grab active:cursor-grabbing",
                isActive ? "bg-text/[0.10]" : "hover:bg-text/[0.06]",
                isDragging && "opacity-40"
              )}
            >
              {isDropTarget ? (
                <span
                  aria-hidden
                  className={clsx(
                    "absolute inset-y-1 w-0.5 rounded-full bg-accent",
                    dropsAfter ? "-right-0.5" : "-left-0.5"
                  )}
                />
              ) : null}
              <button
                type="button"
                onClick={() => setActiveId(tab.id)}
                className="flex min-w-0 items-center gap-2"
              >
                {statuses[tab.id]?.loading ? (
                  <UiIcon name="refresh-circle" className="h-3.5 w-3.5 animate-spin text-accent" />
                ) : (
                  <UiIcon name="globe" className="h-3.5 w-3.5 text-muted" />
                )}
                <SmallText className="!text-text max-w-[160px] truncate">
                  {tab.title || tabLabel(tab.currentUrl || tab.url)}
                </SmallText>
              </button>
              <IconButton
                icon="xmark"
                aria-label={t(translation.GlobalTerm.Close)}
                onClick={() => closeTab(tab.id)}
                className="text-text"
              />
            </div>
          );
        })}

        <Tooltip content={t(translation.Browser.NewTab)} side="bottom">
          <button
            type="button"
            onClick={() => openTab()}
            aria-label={t(translation.Browser.NewTab)}
            className="flex shrink-0 items-center rounded-lg px-2 py-1.5 text-text hover:bg-text/[0.06]"
          >
            <UiIcon name="plus" className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      </div>

      {/* Toolbar */}
      <form onSubmit={submit} className="flex items-center gap-0.5 border-b border-border px-1.5 py-1.5">
        <Control
          icon="arrow-left"
          label={t(translation.GlobalTerm.Back)}
          disabled={!status.canGoBack}
          onClick={() => drive((view) => view.goBack())}
        />
        <Control
          icon="arrow-right"
          label={t(translation.Browser.Forward)}
          disabled={!status.canGoForward}
          onClick={() => drive((view) => view.goForward())}
        />
        <Control
          icon={status.loading ? "xmark" : "refresh-circle"}
          label={t(status.loading ? translation.Browser.Stop : translation.GlobalTerm.Refresh)}
          disabled={!status.ready}
          onClick={() => drive((view) => (status.loading ? view.stop() : view.reload()))}
        />

        <input
          value={address}
          onChange={(event) => {
            editingRef.current = true;
            setAddress(event.target.value);
          }}
          onBlur={() => {
            editingRef.current = false;
          }}
          spellCheck={false}
          placeholder={t(translation.Browser.AddressPlaceholder)}
          aria-label={t(translation.Browser.Address)}
          className={clsx(
            "min-w-0 flex-1 rounded-lg border bg-soft px-2.5 py-1",
            "border-black/[0.06] font-mono text-[11px] text-text outline-none",
            "placeholder:text-muted focus:border-accent dark:border-white/[0.06]"
          )}
        />

        <SendToAgentButton
          url={activeTab?.currentUrl ?? ""}
          title={activeTab?.title ?? ""}
        />

        <LazyShieldPanel
          enabled={shield.enabled}
          ready={shield.ready}
          blocked={shield.blocked}
          busy={shield.busy}
          onToggle={(next) => void shield.toggle(next)}
        />

        {/* Video leaves for the OS player, which floats over other apps; a page
            that is not a video gets our own small always-on-top window. */}
        <Control
          icon="multi-window"
          label={t(translation.Browser.PipMedia)}
          disabled={!status.ready}
          onClick={() =>
            drive((view) => {
              setPipNotice(null);
              void toggleMediaPictureInPicture(view).then((result) => {
                if (result === "none") setPipNotice(t(translation.Browser.PipNoMedia));
                else if (result === "unsupported") {
                  setPipNotice(t(translation.Browser.PipUnsupported));
                }
              });
            })
          }
        />
        <Control
          icon="media-video"
          label={t(pagePip.open ? translation.Browser.PipPageClose : translation.Browser.PipPage)}
          active={pagePip.open}
          disabled={!activeTab?.currentUrl}
          onClick={() => {
            setPipNotice(null);
            void pagePip.toggle(activeTab?.currentUrl ?? null);
          }}
        />

        <Control
          icon="open-new-window"
          label={t(translation.Browser.OpenExternal)}
          disabled={!activeTab?.currentUrl}
          onClick={() => {
            const url = activeTab?.currentUrl;
            if (url) void globalThis.lazify.openExternalUrl(url);
          }}
        />
      </form>

      {pipNotice ? (
        <SmallText className="!text-muted border-b border-border px-3 py-1.5">
          {pipNotice}
        </SmallText>
      ) : null}

      {/* Every navigated tab stays mounted; only the active one is on top.
          A tab still on its start page has no guest, so an idle tab costs no
          renderer process at all. */}
      <div className="relative min-h-0 flex-1">
        {guestTabs.map((tab) => (
          <BrowserGuest
            key={tab.id}
            tab={tab}
            active={tab.id === activeId}
            surfaceVisible={visible}
            onRegister={registerView}
            onStatus={handleStatus}
            onNavigate={handleNavigate}
          />
        ))}

        {activeTab && !activeTab.url ? (
          <div className="absolute inset-0 z-10 bg-bg">
            <BrowserStartPage onGo={navigateActive} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
