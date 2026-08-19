import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { CodeSurface } from "@renderer/shared/ui/code/CodeSurface";
import type { BodyEditor } from "../hooks/use-request-draft";
import type { ApiBody, BodyMode } from "../types";
import { FormBodyRows } from "./FormBodyRows";

interface RequestBodyPanelProps {
  body: ApiBody | null;
  editor: BodyEditor;
}

export function RequestBodyPanel({ body, editor }: Readonly<RequestBodyPanelProps>) {
  const { t } = useTranslation();
  const variant = body?.variants[0] ?? null;
  /** The project declares a shape the scan could not read: say which. */
  const unreadableModel =
    variant && !variant.example && !variant.defaultBody ? variant.schemaType : null;
  const modes: Array<{ id: BodyMode; label: string }> = [
    { id: "json", label: "JSON" },
    { id: "form", label: t(translation.ApiStudio.BodyForm) }
  ];

  return (
    <div className="flex flex-col gap-3">
      {body?.description ? (
        <p className="text-xs leading-5 text-muted">{body.description}</p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {modes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => editor.setMode(mode.id)}
              className={clsx(
                "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                editor.mode === mode.id ? "bg-text/[0.06] text-text" : "text-muted hover:text-text"
              )}
            >
              {mode.label}
            </button>
          ))}

          {body?.required ? (
            <span className="ml-1 rounded-md bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent">
              {t(translation.ApiStudio.Required)}
            </span>
          ) : null}
          {body ? null : (
            <span className="ml-1 text-[11px] text-muted">{t(translation.ApiStudio.NoBody)}</span>
          )}
          {unreadableModel ? (
            <span className="ml-1 text-[11px] text-warning">
              {t(translation.ApiStudio.BodyShapeUnknown, { model: unreadableModel })}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={editor.reset}
            className="text-[11px] font-medium text-muted transition-colors hover:text-text"
          >
            {t(translation.ApiStudio.ResetBody)}
          </button>

          {editor.mode === "json" ? (
            <button
              type="button"
              onClick={editor.format}
              disabled={!editor.valid || !editor.json.trim()}
              className={clsx(
                "text-[11px] font-medium text-muted transition-colors hover:text-text",
                "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-muted"
              )}
            >
              {t(translation.ApiStudio.FormatJson)}
            </button>
          ) : null}
        </div>
      </div>

      {editor.mode === "json" ? (
        <>
          {/* A definite height, because the surface lays its code out absolutely. */}
          <div
            className={clsx(
              "h-[260px] overflow-hidden rounded-lg border bg-bg/45",
              editor.valid ? "border-border" : "border-warning/45"
            )}
          >
            <CodeSurface
              variant="flush"
              wrap
              editable
              content={editor.json}
              fileName="body.json"
              label={t(translation.ApiStudio.Body)}
              placeholder={t(translation.ApiStudio.BodyPlaceholder)}
              onContentChange={editor.setJson}
              className="h-full"
            />
          </div>

          {editor.valid ? null : (
            <span className="text-[11px] text-warning">
              {t(translation.ApiStudio.InvalidJson)}
            </span>
          )}
        </>
      ) : (
        <FormBodyRows entries={editor.entries} onChange={editor.setEntries} />
      )}
    </div>
  );
}
