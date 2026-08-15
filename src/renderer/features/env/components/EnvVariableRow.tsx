import clsx from "clsx";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { EnvVariable } from "@renderer/shared/types/lazify";
import { CaptionText, MonoText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";
import { Switch } from "@renderer/shared/ui/Switch";
import { TextInput } from "@renderer/shared/ui/form/FormInput";
import { EnvValueEditor } from "./EnvValueEditor";

interface EnvVariableRowProps {
  variable: EnvVariable;
  /** False masks the value; the name is never masked — it is not the secret. */
  revealed: boolean;
  busy: boolean;
  onToggle: (enabled: boolean) => void;
  onSave: (key: string, value: string) => void;
  onDelete: () => void;
}

/** Long enough to read as redacted, short enough not to reflow a narrow rail. */
const MASK = "••••••••••••";

/**
 * One variable, as a card.
 *
 * The card is the point: a .env is a wall of `KEY=value` in one typeface, and a
 * flat list of those reproduces the wall the panel was meant to replace. Each
 * variable gets its own bordered box, the name sits on its own line, and the
 * value sits in a recessed field under it — so the eye can tell where one
 * variable ends and the next begins without reading a character.
 *
 * A disabled variable keeps the same box in a dashed border: still an item,
 * visibly not in play.
 */
export function EnvVariableRow({
  variable,
  revealed,
  busy,
  onToggle,
  onSave,
  onDelete
}: Readonly<EnvVariableRowProps>) {
  const { t } = useTranslation();

  const [editing, setEditing] = useState(false);
  const [key, setKey] = useState(variable.key);
  const [value, setValue] = useState(variable.value);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // A refresh — or someone else's edit — replaces the variable underneath an
  // open editor. Reset to what the file now says rather than keep typing over it.
  useEffect(() => {
    setKey(variable.key);
    setValue(variable.value);
    setEditing(false);
    setConfirmingDelete(false);
  }, [variable.key, variable.value, variable.line]);

  const commit = () => {
    const trimmedKey = key.trim();
    if (trimmedKey === "") return;
    if (trimmedKey !== variable.key || value !== variable.value) {
      onSave(trimmedKey, value);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="rounded-xl border border-accent/40 bg-accent/[0.04] p-2 shadow-sm">
        <CaptionText tone="muted" className="mb-1 block uppercase tracking-wide">
          {t(translation.EnvPane.Name)}
        </CaptionText>
        <TextInput
          size="sm"
          value={key}
          autoFocus
          spellCheck={false}
          aria-label={t(translation.EnvPane.Name)}
          placeholder={t(translation.EnvPane.NamePlaceholder)}
          inputClassName="font-mono text-xs"
          onChange={(event) => setKey(event.target.value.toUpperCase())}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit();
            if (event.key === "Escape") setEditing(false);
          }}
        />

        <CaptionText tone="muted" className="mb-1 mt-2 block uppercase tracking-wide">
          {t(translation.EnvPane.Value)}
        </CaptionText>
        <EnvValueEditor
          value={value}
          onChange={setValue}
          onCommit={commit}
          onCancel={() => setEditing(false)}
        />

        <div className="mt-2 flex items-center justify-end gap-1">
          <IconButton
            icon="xmark"
            title={t(translation.GlobalTerm.Cancel)}
            aria-label={t(translation.GlobalTerm.Cancel)}
            onClick={() => setEditing(false)}
          />
          <IconButton
            icon="check-circle"
            title={t(translation.GlobalTerm.Save)}
            aria-label={t(translation.GlobalTerm.Save)}
            disabled={key.trim() === "" || busy}
            onClick={commit}
            className="text-accent"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "group rounded-lg px-2 py-1.5 transition-colors",
        // The only container is the one under the pointer. Everything else is
        // held together by proximity — name and value sit tight, and the gap to
        // the next variable is several times larger.
        "hover:bg-text/[0.05] focus-within:bg-text/[0.05]",
        !variable.enabled && "opacity-70"
      )}
    >
      <div className="flex items-center gap-2">
        <MonoText
          as="span"
          className={clsx(
            "min-w-0 flex-1 truncate text-[11px] font-semibold",
            variable.enabled ? "!text-text" : "!text-muted line-through decoration-muted/50"
          )}
          title={variable.key}
        >
          {variable.key}
        </MonoText>

        {/* Every control, including the switch, appears only under the pointer.
            The groups above already say which variables are on, so a switch per
            row was restating that eight times in accent green — state to read,
            not a control to use. Reaching for one reveals it. */}
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {confirmingDelete ? (
            <>
              <IconButton
                icon="xmark"
                title={t(translation.GlobalTerm.Cancel)}
                aria-label={t(translation.GlobalTerm.Cancel)}
                onClick={() => setConfirmingDelete(false)}
              />
              <IconButton
                icon="trash"
                title={t(translation.EnvPane.ConfirmDelete)}
                aria-label={t(translation.EnvPane.ConfirmDelete)}
                disabled={busy}
                onClick={onDelete}
                className="!text-rose-600 dark:!text-rose-400"
              />
            </>
          ) : (
            <>
              <IconButton
                icon="edit"
                title={t(translation.EnvPane.EditVariable)}
                aria-label={`${t(translation.EnvPane.EditVariable)} ${variable.key}`}
                disabled={busy}
                onClick={() => setEditing(true)}
              />
              <IconButton
                icon="trash"
                title={t(translation.GlobalTerm.Delete)}
                aria-label={`${t(translation.GlobalTerm.Delete)} ${variable.key}`}
                disabled={busy}
                onClick={() => setConfirmingDelete(true)}
              />
            </>
          )}

          <Switch
            checked={variable.enabled}
            disabled={busy}
            label={
              variable.enabled
                ? `${t(translation.EnvPane.Disable)} ${variable.key}`
                : `${t(translation.EnvPane.Enable)} ${variable.key}`
            }
            onChange={onToggle}
          />
        </div>
      </div>

      {/* Tight to its name — that closeness is what makes the pair read as one
          item. One line only, so every variable costs the same height and the
          list stays scannable; the full value is on the hover title and in the
          editor, which is where reading it in full actually matters. */}
      <MonoText
        as="span"
        className="mt-px block truncate pr-2 text-[11px] leading-snug !text-muted"
        title={revealed ? variable.value : undefined}
      >
        {revealed ? variable.value || t(translation.EnvPane.EmptyValue) : MASK}
      </MonoText>

      {variable.comment ? (
        <CaptionText tone="muted" className="mt-px block truncate italic opacity-80">
          {`# ${variable.comment}`}
        </CaptionText>
      ) : null}
    </div>
  );
}
