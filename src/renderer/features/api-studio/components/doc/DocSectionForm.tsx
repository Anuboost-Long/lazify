import clsx from "clsx";
import { useTranslation } from "react-i18next";

import {
  COLLECTION_SECTIONS,
  FOLDER_SECTION,
  ROUTE_SECTIONS
} from "@main/api-studio/docs/sections";
import type { CollectionDoc, DocGap } from "@main/api-studio/docs/types";
import { translation } from "@renderer/i18n/translation";
import { requestsOf, type CustomCollection } from "../../custom-collection";
import { gapKey } from "@main/api-studio/docs/gap-key";
import type { DocSelection } from "../../doc-selection";
import { MethodBadge } from "../MethodBadge";
import { DocSectionField } from "./DocSectionField";

interface DocSectionFormProps {
  doc: CollectionDoc;
  gaps: DocGap[];
  collection: CustomCollection;
  selected: DocSelection;
  /** Keys main reported as just answered, in gapKey shape. */
  answered: ReadonlySet<string>;
  onAsk: (key: string) => void;
  onChange: (change: (doc: CollectionDoc) => CollectionDoc) => void;
}

const FIELD_CLASS = clsx(
  "h-9 w-full rounded-lg border border-border bg-bg/45 px-3",
  "text-xs text-text outline-none placeholder:text-muted/70 focus:border-accent/50"
);

export function DocSectionForm({
  doc,
  gaps,
  collection,
  selected,
  answered,
  onAsk,
  onChange
}: Readonly<DocSectionFormProps>) {
  const { t } = useTranslation();
  const gapFor = (requestId: string | null, sectionId: string) =>
    gaps.find(
      (gap) => gap.requestId === requestId && !gap.folderId && gap.sectionId === sectionId
    ) ?? null;
  const keyFor = (requestId: string | null, folderId: string | undefined, sectionId: string) =>
    gapKey({ requestId, folderId, sectionId, where: "", question: "" });

  if (selected.kind === "folder") {
    const folder = doc.folders.find((one) => one.id === selected.id);

    if (!folder) return null;

    const folderGap = gaps.find((gap) => gap.folderId === folder.id) ?? null;

    return (
      <div className="flex flex-col gap-4 p-5">
        <h2 className="text-sm font-semibold text-text">{folder.name}</h2>

        <DocSectionField
          spec={FOLDER_SECTION}
          value={folder.description}
          answered={answered.has(`|${folder.id}|folder_description`)}
          question={folderGap?.question ?? null}
          onAsk={
            folder.description.trim()
              ? undefined
              : () => onAsk(keyFor(null, folder.id, FOLDER_SECTION.id))
          }
          onChange={(markdown) =>
            onChange((current) => ({
              ...current,
              folders: current.folders.map((one) =>
                one.id === folder.id ? { ...one, description: markdown } : one
              )
            }))
          }
        />
      </div>
    );
  }

  if (selected.kind === "document") {
    const setField = (field: "title" | "subtitle" | "version" | "baseUrl", value: string) =>
      onChange((current) => ({ ...current, [field]: value }));

    return (
      <div className="flex flex-col gap-5 p-5">
        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              {t(translation.ApiStudio.DocTitle)}
            </span>
            <input
              value={doc.title}
              spellCheck={false}
              onChange={(event) => setField("title", event.target.value)}
              className={FIELD_CLASS}
            />
          </label>

          <label className="col-span-2 flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              {t(translation.ApiStudio.DocSubtitle)}
            </span>
            <input
              value={doc.subtitle}
              onChange={(event) => setField("subtitle", event.target.value)}
              className={FIELD_CLASS}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              {t(translation.ApiStudio.DocVersion)}
            </span>
            <input
              value={doc.version}
              spellCheck={false}
              placeholder="1.0.0"
              onChange={(event) => setField("version", event.target.value)}
              className={FIELD_CLASS}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              {t(translation.ApiStudio.DocBaseUrl)}
            </span>
            <input
              value={doc.baseUrl}
              spellCheck={false}
              placeholder="https://api.example.com"
              onChange={(event) => setField("baseUrl", event.target.value)}
              className={clsx(FIELD_CLASS, "font-mono")}
            />
          </label>
        </div>

        <div className="flex flex-col">
          {COLLECTION_SECTIONS.map((spec) => {
            const gap = gapFor(null, spec.id);

            return (
            <DocSectionField
              key={spec.id}
              spec={spec}
              value={doc.sections[spec.id] ?? ""}
              answered={answered.has(`||${spec.id}`)}
              question={gap?.question ?? null}
              onAsk={
                doc.sections[spec.id]?.trim()
                  ? undefined
                  : () => onAsk(keyFor(null, undefined, spec.id))
              }
              onChange={(markdown) =>
                onChange((current) => ({
                  ...current,
                  sections: { ...current.sections, [spec.id]: markdown }
                }))
              }
            />
            );
          })}
        </div>
      </div>
    );
  }

  const selectedId = selected.id;
  const entry = doc.routes.find((route) => route.requestId === selectedId);
  const request = requestsOf(collection).find((held) => held.id === selectedId);

  if (!entry || !request) return null;

  const setSection = (sectionId: string, markdown: string) =>
    onChange((current) => ({
      ...current,
      routes: current.routes.map((route) =>
        route.requestId === selectedId
          ? {
              ...route,
              sections: { ...route.sections, [sectionId]: markdown },
              writtenBy: "user" as const,
              updatedAt: new Date().toISOString()
            }
          : route
      )
    }));

  return (
    <div className="flex flex-col gap-4 p-5">
      <header className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <MethodBadge method={request.route.method} />
          <span className="truncate font-mono text-xs text-muted">{request.route.path}</span>
        </div>
        <input
          value={entry.title}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              routes: current.routes.map((route) =>
                route.requestId === selectedId ? { ...route, title: event.target.value } : route
              )
            }))
          }
          className={clsx(FIELD_CLASS, "font-semibold")}
        />
        {entry.writtenBy === "agent" ? (
          <span className="text-[10px] uppercase tracking-wide text-accent">
            {t(translation.ApiStudio.DocWrittenByAgent)}
          </span>
        ) : null}
      </header>

      <div className="flex flex-col">
        {ROUTE_SECTIONS.map((spec) => {
          const gap = gapFor(selectedId, spec.id);

          return (
            <DocSectionField
              key={spec.id}
              spec={spec}
              value={entry.sections[spec.id] ?? ""}
              answered={answered.has(`${selectedId}||${spec.id}`)}
              question={gap?.question ?? null}
              onAsk={
                entry.sections[spec.id]?.trim()
                  ? undefined
                  : () => onAsk(keyFor(selectedId, undefined, spec.id))
              }
              onChange={(markdown) => setSection(spec.id, markdown)}
            />
          );
        })}
      </div>
    </div>
  );
}
