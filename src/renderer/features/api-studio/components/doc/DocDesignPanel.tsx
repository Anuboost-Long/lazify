import clsx from "clsx";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { CollectionDoc, DocMargin, DocPageSize, DocTheme } from "@main/api-studio/docs/types";
import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { Switch } from "@renderer/shared/ui/Switch";
import { DocDesignPreview } from "./DocDesignPreview";
import { DocLogoField } from "./DocLogoField";

interface DocDesignPanelProps {
  doc: CollectionDoc;
  onChange: (change: (doc: CollectionDoc) => CollectionDoc) => void;
}

const ACCENTS = ["#2f6feb", "#0f766e", "#7e22ce", "#b45309", "#be123c", "#111827"];

interface RowProps {
  label: string;
  children: ReactNode;
}

/** One surface, divided: a row per decision, its name always in the same column. */
function Row({ label, children }: Readonly<RowProps>) {
  return (
    <div className="flex flex-col gap-2.5 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4">
      <span className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

export function DocDesignPanel({ doc, onChange }: Readonly<DocDesignPanelProps>) {
  const { t } = useTranslation();
  const setTheme = (change: Partial<DocTheme>) =>
    onChange((current) => ({ ...current, theme: { ...current.theme, ...change } }));
  const margins: Array<[DocMargin, string]> = [
    ["narrow", t(translation.ApiStudio.DocMarginNarrow)],
    ["normal", t(translation.ApiStudio.DocMarginNormal)],
    ["wide", t(translation.ApiStudio.DocMarginWide)]
  ];
  const pageSizes: DocPageSize[] = ["A4", "Letter"];
  const included: Array<[keyof DocTheme, string]> = [
    ["cover", t(translation.ApiStudio.DocCover)],
    ["contents", t(translation.ApiStudio.DocContents)],
    ["curl", t(translation.ApiStudio.DocCurl)],
    ["examples", t(translation.ApiStudio.DocExamples)],
    ["darkCode", t(translation.ApiStudio.DocDarkCode)]
  ];
  const chip = (active: boolean) =>
    clsx(
      "h-8 rounded-lg border px-3 text-[11px] font-medium transition-colors",
      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/60",
      active
        ? "border-accent/50 bg-accent/10 text-text"
        : "border-border text-muted hover:border-accent/30 hover:text-text"
    );

  return (
    <div className="flex min-h-0 flex-1 flex-wrap items-start gap-6 overflow-y-auto p-5">
      <div
        className={clsx(
          "flex min-w-[22rem] flex-1 flex-col divide-y divide-border",
          "rounded-xl border border-border bg-bg/40"
        )}
      >
        <Row label={t(translation.ApiStudio.DocName)}>
          <input
            value={doc.title}
            spellCheck={false}
            placeholder={t(translation.ApiStudio.DocTitle)}
            onChange={(event) => onChange((current) => ({ ...current, title: event.target.value }))}
            className={clsx(
              "h-9 w-full rounded-lg border border-border bg-bg/45 px-3",
              "text-xs font-semibold text-text outline-none placeholder:text-muted/70",
              "focus:border-accent/50"
            )}
          />
        </Row>

        <Row label={t(translation.ApiStudio.DocLogo)}>
          <DocLogoField bare logo={doc.theme.logo} onChange={(logo) => setTheme({ logo })} />
        </Row>

        <Row label={t(translation.ApiStudio.DocAccent)}>
          {ACCENTS.map((accent) => (
            <button
              key={accent}
              type="button"
              aria-label={accent}
              aria-pressed={doc.theme.accent === accent}
              onClick={() => setTheme({ accent })}
              style={{ backgroundColor: accent }}
              className={clsx(
                "flex h-7 w-7 items-center justify-center rounded-full transition-transform",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/60",
                doc.theme.accent === accent && "outline outline-2 outline-offset-2 outline-text/40"
              )}
            >
              {doc.theme.accent === accent ? (
                <UiIcon name="check-circle" className="h-3.5 w-3.5 text-white" />
              ) : null}
            </button>
          ))}

          <label className="relative ml-1 h-7 w-7 shrink-0 overflow-hidden rounded-full border border-dashed border-border">
            <span className="sr-only">{t(translation.ApiStudio.DocAccent)}</span>
            <input
              type="color"
              value={doc.theme.accent}
              onChange={(event) => setTheme({ accent: event.target.value })}
              className="absolute -inset-2 h-11 w-11 cursor-pointer border-0 bg-transparent p-0"
            />
          </label>
        </Row>

        <Row label={t(translation.ApiStudio.DocPageSize)}>
          {pageSizes.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setTheme({ pageSize: size })}
              className={chip(doc.theme.pageSize === size)}
            >
              {size}
            </button>
          ))}

          <span className="mx-1 h-4 w-px bg-border" />

          {margins.map(([value, name]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme({ margin: value })}
              className={chip(doc.theme.margin === value)}
            >
              {name}
            </button>
          ))}
        </Row>

        {included.map(([key, name]) => (
          <div key={key} className="flex items-center justify-between gap-4 px-4 py-2.5">
            <span className="text-xs text-text">{name}</span>
            <Switch
              checked={Boolean(doc.theme[key])}
              label={name}
              tone="quiet"
              onChange={(next) => setTheme({ [key]: next } as Partial<DocTheme>)}
            />
          </div>
        ))}
      </div>

      <DocDesignPreview doc={doc} />
    </div>
  );
}
