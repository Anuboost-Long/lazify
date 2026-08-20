import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { InlineRename } from "./InlineRename";
import { RowMenuButton, useRowMenu } from "./RowMenuButton";

export interface RequestField {
  key: string;
  label: string;
  meta: string[];
  detail: string | null;
  placeholder: string;
  added?: boolean;
  repeat?: boolean;
}

interface RequestFieldRowsProps {
  fields: RequestField[];
  values: Record<string, string>;
  readOnly?: boolean;
  onChange: (key: string, value: string) => void;
  onRename?: (key: string, name: string) => void;
  onRemove?: (key: string) => void;
  onRepeat?: (key: string) => string | null;
  onAdd?: () => string | null;
}

interface FieldRowProps {
  field: RequestField;
  value: string;
  renaming: boolean;
  readOnly: boolean;
  onChange: (value: string) => void;
  onRename: (name: string) => void;
  onRenamingChange: (renaming: boolean) => void;
  onRepeat: (() => void) | null;
  onRemove: (() => void) | null;
}

function FieldRow({
  field,
  value,
  renaming,
  readOnly,
  onChange,
  onRename,
  onRenamingChange,
  onRepeat,
  onRemove
}: Readonly<FieldRowProps>) {
  const { t } = useTranslation();
  const [menuAt, setMenuAt] = useRowMenu();

  return (
    <tr
      onContextMenu={(event) => {
        if (readOnly || (!field.added && !onRepeat)) return;

        event.preventDefault();
        setMenuAt({ x: event.clientX, y: event.clientY });
      }}
      className="group/field transition-colors hover:bg-text/[0.02]"
    >
      <td className="w-[34%] border-r border-border px-3 py-1.5 align-middle">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-2">
            {field.repeat ? <span className="w-3 shrink-0" /> : null}
            {renaming ? (
              <InlineRename
                value={field.label}
                label={t(translation.ApiStudio.FieldName)}
                onCommit={(name) => {
                  onRename(name);
                  onRenamingChange(false);
                }}
                onCancel={() => onRenamingChange(false)}
              />
            ) : field.added && !readOnly ? (
              <button
                type="button"
                onClick={() => onRenamingChange(true)}
                title={t(translation.ApiStudio.RenameField)}
                className="min-w-0 truncate text-left font-mono text-xs font-semibold text-text transition-colors hover:text-accent"
              >
                {field.label}
              </button>
            ) : (
              <span className="min-w-0 truncate font-mono text-xs font-semibold text-text">
                {field.label}
              </span>
            )}

            {renaming
              ? null
              : field.meta.map((entry) => (
                  <span
                    key={entry}
                    className="shrink-0 rounded bg-text/[0.06] px-1.5 py-0.5 text-[10px] text-muted"
                  >
                    {entry}
                  </span>
                ))}
          </div>

          {field.detail ? (
            <span className="truncate text-[10px] leading-4 text-muted" title={field.detail}>
              {field.detail}
            </span>
          ) : null}
        </div>
      </td>

      <td className="px-2 py-1.5 align-middle">
        <input
          value={value}
          readOnly={readOnly}
          aria-label={field.label}
          spellCheck={false}
          autoComplete="off"
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={clsx(
            "h-9 w-full rounded-lg border border-transparent bg-transparent px-2.5",
            "font-mono text-xs text-text outline-none placeholder:text-muted/60",
            readOnly
              ? "cursor-default text-muted"
              : "hover:border-border focus:border-accent/50 focus:bg-bg/45"
          )}
        />
      </td>

      <td className="w-10 border-l border-border px-1 py-1.5 text-center align-middle">
        {(onRemove || onRepeat) && !readOnly ? (
          <span className="opacity-0 transition-opacity group-hover/field:opacity-100 focus-within:opacity-100">
            <RowMenuButton
              label={field.label}
              openAt={menuAt}
              onOpenAtChange={setMenuAt}
              items={[
                ...(onRepeat
                  ? [
                      {
                        key: "repeat",
                        label: t(translation.ApiStudio.AddAnotherValue),
                        onSelect: onRepeat
                      }
                    ]
                  : []),
                ...(field.added && !field.repeat
                  ? [
                      {
                        key: "rename",
                        label: t(translation.ApiStudio.RenameField),
                        onSelect: () => onRenamingChange(true)
                      }
                    ]
                  : []),
                ...(onRemove
                  ? [
                      {
                        key: "remove",
                        label: t(translation.ApiStudio.RemoveField),
                        destructive: true,
                        onSelect: onRemove
                      }
                    ]
                  : [])
              ]}
            />
          </span>
        ) : null}
      </td>
    </tr>
  );
}

export function RequestFieldRows({
  fields,
  values,
  readOnly = false,
  onChange,
  onRename,
  onRemove,
  onRepeat,
  onAdd
}: Readonly<RequestFieldRowsProps>) {
  const { t } = useTranslation();
  const [renamingKey, setRenamingKey] = useState<string | null>(null);

  return (
    <div className="-mx-4 -mt-3 flex flex-col">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border text-[10px] font-semibold uppercase tracking-wide text-muted">
            <th className="w-[34%] border-r border-border px-3 py-2 text-left">
              {t(translation.ApiStudio.FieldName)}
            </th>
            <th className="px-3 py-2 text-left">{t(translation.ApiStudio.FieldValue)}</th>
            <th className="w-10 border-l border-border" />
          </tr>
        </thead>

        <tbody className="divide-y divide-border">
          {fields.map((field) => (
            <FieldRow
              key={field.key}
              field={field}
              value={values[field.key] ?? ""}
              readOnly={readOnly}
              renaming={renamingKey === field.key}
              onChange={(value) => onChange(field.key, value)}
              onRename={(name) => onRename?.(field.key, name)}
              onRenamingChange={(renaming) => setRenamingKey(renaming ? field.key : null)}
              onRepeat={onRepeat ? () => onRepeat(field.key) : null}
              onRemove={
                (field.added || field.repeat) && onRemove ? () => onRemove(field.key) : null
              }
            />
          ))}
        </tbody>
      </table>

      {onAdd && !readOnly ? (
        <button
          type="button"
          onClick={() => setRenamingKey(onAdd())}
          className={clsx(
            "m-3 flex items-center gap-1.5 self-start rounded-lg border border-dashed border-border px-3 py-2",
            "text-[11px] font-medium text-muted transition-colors",
            "hover:border-accent/40 hover:text-text"
          )}
        >
          <UiIcon name="plus" className="h-3.5 w-3.5" />
          {t(translation.ApiStudio.AddField)}
        </button>
      ) : null}
    </div>
  );
}
