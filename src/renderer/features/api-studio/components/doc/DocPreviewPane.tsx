import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { DocFormat } from "@main/api-studio/docs/types";
import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface DocPreviewPaneProps {
  projectPath: string;
  collectionId: string;
  title: string;
  refreshKey: number | null;
}

const ACTION_CLASS = clsx(
  "flex items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-1.5",
  "text-[11px] font-medium text-text transition-colors hover:border-accent/40",
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border"
);

export function DocPreviewPane({
  projectPath,
  collectionId,
  title,
  refreshKey
}: Readonly<DocPreviewPaneProps>) {
  const { t } = useTranslation();
  const [html, setHtml] = useState<string | null>(null);
  const [building, setBuilding] = useState(true);
  const [failed, setFailed] = useState(false);
  const [note, setNote] = useState<{ text: string; failed: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadAt, setReloadAt] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const asked = event.data as { type?: string; text?: string } | null;

      if (event.source !== frame.current?.contentWindow) return;
      if (asked?.type !== "lazify-doc-copy" || typeof asked.text !== "string") return;

      void navigator.clipboard
        ?.writeText(asked.text.slice(0, 100_000))
        .then(() =>
          frame.current?.contentWindow?.postMessage({ type: "lazify-doc-copied" }, "*")
        )
        .catch(() => undefined);
    };

    globalThis.addEventListener("message", onMessage);

    return () => globalThis.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    let cancelled = false;

    setBuilding(true);
    setFailed(false);

    void globalThis.lazify
      .previewCollectionDoc(projectPath, collectionId)
      .then((built) => {
        if (cancelled) return;

        if (built) setHtml(built);
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setBuilding(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectPath, collectionId, refreshKey, reloadAt]);

  const exportAs = (format: DocFormat) => {
    setBusy(true);
    void globalThis.lazify
      .exportCollectionDoc(projectPath, collectionId, format, title)
      .then((result) => {
        if (result) {
          setNote({ text: t(translation.ApiStudio.DocExported, { path: result.filePath }), failed: false });
        }
      })
      .catch(() => setNote({ text: t(translation.ApiStudio.DocExportFailed), failed: true }))
      .finally(() => setBusy(false));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2.5">
        <button
          type="button"
          onClick={() => setReloadAt(Date.now())}
          className={ACTION_CLASS}
        >
          <UiIcon name="refresh-circle" className="h-3.5 w-3.5" />
          {t(translation.ApiStudio.DocRefreshPreview)}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void globalThis.lazify
              .openCollectionDoc(projectPath, collectionId)
              .then((failure) => {
                if (failure) {
                  setNote({ text: t(translation.ApiStudio.DocOpenFailed), failed: true });
                }
              })
              .catch(() => setNote({ text: t(translation.ApiStudio.DocOpenFailed), failed: true }))
              .finally(() => setBusy(false));
          }}
          className={ACTION_CLASS}
        >
          <UiIcon name="open-new-window" className="h-3.5 w-3.5" />
          {t(translation.ApiStudio.DocOpenInBrowser)}
        </button>

        <span className="flex-1" />

        <button
          type="button"
          disabled={busy}
          onClick={() => exportAs("html")}
          className={ACTION_CLASS}
        >
          <UiIcon name="html" className="h-3.5 w-3.5" />
          {t(translation.ApiStudio.DocExportHtml)}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => exportAs("pdf")}
          className={ACTION_CLASS}
        >
          <UiIcon name="download" className="h-3.5 w-3.5" />
          {t(translation.ApiStudio.DocExportPdf)}
        </button>
      </div>

      {note ? (
        <p
          className={clsx(
            "truncate border-b border-border px-4 py-2 text-[11px]",
            note.failed ? "text-error" : "text-accent"
          )}
        >
          {note.text}
        </p>
      ) : null}

      <div className="min-h-0 flex-1 bg-white">
        {building || failed || !html ? (
          <p className="p-6 text-xs text-muted">
            {failed
              ? t(translation.ApiStudio.DocPreviewFailed)
              : t(translation.ApiStudio.DocPreviewBuilding)}
          </p>
        ) : (
          <iframe
            ref={frame}
            srcDoc={html}
            title={title}
            sandbox="allow-scripts"
            className="h-full w-full border-0 bg-white"
          />
        )}
      </div>
    </div>
  );
}
