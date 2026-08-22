import clsx from "clsx";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { DEFAULT_DOC_PRESET_ID, DOC_PRESETS } from "@main/api-studio/docs/presets";
import type { CollectionDoc, DocBrief } from "@main/api-studio/docs/types";
import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface DocAgentPanelProps {
  projectPath: string;
  doc: CollectionDoc;
  refreshKey: number | null;
  onChange: (change: (doc: CollectionDoc) => CollectionDoc) => void;
  onImported: () => void;
}

const ACTION_CLASS = clsx(
  "flex items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-1.5",
  "text-[11px] font-medium text-text transition-colors hover:border-accent/40",
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border"
);

export function DocAgentPanel({
  projectPath,
  doc,
  refreshKey,
  onChange,
  onImported
}: Readonly<DocAgentPanelProps>) {
  const { t } = useTranslation();
  const [brief, setBrief] = useState<DocBrief | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const presetId = doc.presetId || DEFAULT_DOC_PRESET_ID;

  useEffect(() => {
    let cancelled = false;

    void globalThis.lazify
      .collectionDocBrief(projectPath, doc.collectionId)
      .then((next) => {
        if (!cancelled) setBrief(next);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [projectPath, doc.collectionId, presetId, refreshKey]);

  const writeBrief = () => {
    setBusy(true);
    void globalThis.lazify
      .writeCollectionDocBrief(projectPath, doc.collectionId)
      .then((files) => {
        if (files) setNote(t(translation.ApiStudio.DocBriefWritten, { path: files.directory }));
      })
      .catch(() => undefined)
      .finally(() => setBusy(false));
  };

  const importDraft = (choose: boolean) => {
    setBusy(true);
    void globalThis.lazify
      .importCollectionDocDraft(projectPath, doc.collectionId, choose)
      .then((result) => {
        if (!result) {
          setNote(t(translation.ApiStudio.DocImportMissing));
          return;
        }

        onImported();
        setNote(
          [
            t(translation.ApiStudio.DocImportDone, { count: result.filled }),
            result.ignored.length > 0
              ? t(translation.ApiStudio.DocImportIgnored, { ids: result.ignored.join(", ") })
              : ""
          ]
            .filter(Boolean)
            .join(" · ")
        );
      })
      .catch(() => undefined)
      .finally(() => setBusy(false));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-5">
      <p className="text-[11px] leading-5 text-muted">{t(translation.ApiStudio.DocBriefDesc)}</p>

      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
          {t(translation.ApiStudio.DocPreset)}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {DOC_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              title={preset.description}
              onClick={() => onChange((current) => ({ ...current, presetId: preset.id }))}
              className={clsx(
                "rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors",
                preset.id === presetId
                  ? "border-accent/50 bg-accent/10 text-text"
                  : "border-border text-muted hover:border-accent/30 hover:text-text"
              )}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          disabled={!brief}
          onClick={() => {
            if (!brief) return;

            void navigator.clipboard.writeText(brief.instructions).catch(() => undefined);
            setNote(t(translation.ApiStudio.DocCopied));
          }}
          className={ACTION_CLASS}
        >
          <UiIcon name="code" className="h-3.5 w-3.5" />
          {t(translation.ApiStudio.DocCopyBrief)}
        </button>

        <button type="button" disabled={busy} onClick={writeBrief} className={ACTION_CLASS}>
          <UiIcon name="download" className="h-3.5 w-3.5" />
          {t(translation.ApiStudio.DocWriteBrief)}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => importDraft(false)}
          className={ACTION_CLASS}
        >
          <UiIcon name="import" className="h-3.5 w-3.5" />
          {t(translation.ApiStudio.DocImportDraft)}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => importDraft(true)}
          className={ACTION_CLASS}
        >
          {t(translation.ApiStudio.DocChooseDraft)}
        </button>
      </div>

      {note ? <p className="text-[11px] leading-5 text-accent">{note}</p> : null}

      <pre
        className={clsx(
          "min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-bg/45 p-3",
          "font-mono text-[11px] leading-5 text-muted"
        )}
      >
        {brief?.instructions ?? ""}
      </pre>
    </div>
  );
}
