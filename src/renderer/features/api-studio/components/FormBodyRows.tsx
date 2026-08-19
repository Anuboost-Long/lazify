import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { FormEntry } from "../types";

interface FormBodyRowsProps {
  entries: FormEntry[];
  onChange: (entries: FormEntry[]) => void;
}

const INPUT_CLASS = clsx(
  "h-8 min-w-0 rounded-lg border border-border bg-bg/45 px-2.5 font-mono text-xs text-text",
  "outline-none placeholder:text-muted/70 focus:border-accent/50"
);

const fileName = (value: string) => value.split(/[\\/]/).pop() ?? value;

export function FormBodyRows({ entries, onChange }: Readonly<FormBodyRowsProps>) {
  const { t } = useTranslation();

  const replace = (index: number, entry: Partial<FormEntry>) =>
    onChange(entries.map((current, at) => (at === index ? { ...current, ...entry } : current)));

  const chooseFile = (index: number) => {
    void globalThis.lazify
      .chooseUploadFile()
      .then((filePath) => {
        if (filePath) replace(index, { value: filePath, kind: "file" });
      })
      .catch(() => undefined);
  };

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            value={entry.name}
            spellCheck={false}
            autoComplete="off"
            aria-label={t(translation.ApiStudio.FieldName)}
            placeholder={t(translation.ApiStudio.FieldName)}
            onChange={(event) => replace(index, { name: event.target.value })}
            className={clsx(INPUT_CLASS, "w-2/5")}
          />

          {entry.kind === "file" ? (
            <button
              type="button"
              onClick={() => chooseFile(index)}
              title={entry.value}
              aria-label={t(translation.ApiStudio.FieldValue)}
              className={clsx(
                INPUT_CLASS,
                "flex flex-1 items-center gap-1.5 text-left text-accent hover:border-accent/50"
              )}
            >
              <UiIcon name="page" className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {entry.value ? fileName(entry.value) : t(translation.ApiStudio.ChooseFile)}
              </span>
            </button>
          ) : (
            <input
              value={entry.value}
              spellCheck={false}
              autoComplete="off"
              aria-label={t(translation.ApiStudio.FieldValue)}
              placeholder={t(translation.ApiStudio.FieldValue)}
              onChange={(event) => replace(index, { value: event.target.value })}
              className={clsx(INPUT_CLASS, "flex-1")}
            />
          )}

          <button
            type="button"
            aria-pressed={entry.kind === "file"}
            title={t(translation.ApiStudio.SendAsFile)}
            aria-label={`${t(translation.ApiStudio.SendAsFile)} ${entry.name || index + 1}`}
            onClick={() =>
              entry.kind === "file"
                ? replace(index, { kind: "text", value: "" })
                : chooseFile(index)
            }
            className={clsx(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
              entry.kind === "file"
                ? "border-accent/50 bg-accent/[0.08] text-accent"
                : "border-border text-muted hover:text-text"
            )}
          >
            <UiIcon name="import" className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            title={t(translation.ApiStudio.RemoveField)}
            aria-label={t(translation.ApiStudio.RemoveField)}
            onClick={() => onChange(entries.filter((_, at) => at !== index))}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-text/[0.06] hover:text-text"
          >
            <UiIcon name="xmark" className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...entries, { name: "", value: "", kind: "text" }])}
        className={clsx(
          "flex h-8 w-fit items-center gap-1.5 rounded-lg border border-dashed border-border",
          "px-2.5 text-xs font-medium text-muted transition-colors hover:border-accent/50 hover:text-text"
        )}
      >
        <UiIcon name="plus" className="h-3.5 w-3.5" />
        {t(translation.ApiStudio.AddField)}
      </button>
    </div>
  );
}
