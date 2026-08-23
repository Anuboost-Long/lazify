import clsx from "clsx";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { DetectedEditor } from "@main/environment/editor-catalog";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface EditorPickerProps {
  /** The command template in force; empty means the system default. */
  command: string;
  onChange: (command: string) => void;
}

const SYSTEM_DEFAULT = "";

export function EditorPicker({ command, onChange }: Readonly<EditorPickerProps>) {
  const { t } = useTranslation();
  const [editors, setEditors] = useState<DetectedEditor[] | null>(null);
  const [scanning, setScanning] = useState(false);

  const scan = () => {
    setScanning(true);

    void globalThis.lazify
      .detectEditors()
      .then(setEditors)
      .catch(() => setEditors([]))
      .finally(() => setScanning(false));
  };

  useEffect(scan, []);

  const custom = command !== SYSTEM_DEFAULT && !editors?.some((editor) => editor.command === command);

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-text">
          {t(translation.Settings.EditorFound)}
        </span>
        <button
          type="button"
          onClick={scan}
          disabled={scanning}
          className={clsx(
            "flex items-center gap-1.5 text-[11px] font-medium text-muted",
            "transition-colors hover:text-text disabled:opacity-40"
          )}
        >
          <UiIcon name="refresh-circle" className="h-3.5 w-3.5" />
          {t(scanning ? translation.GlobalTerm.Scanning : translation.GlobalTerm.Rescan)}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <EditorChip
          label={t(translation.Settings.EditorSystemDefault)}
          selected={command === SYSTEM_DEFAULT}
          onSelect={() => onChange(SYSTEM_DEFAULT)}
        />

        {(editors ?? []).map((editor) => (
          <EditorChip
            key={editor.id}
            label={editor.label}
            selected={command === editor.command}
            onSelect={() => onChange(editor.command)}
          />
        ))}
      </div>

      {editors !== null && editors.length === 0 ? (
        <p className="text-[11px] leading-4 text-muted">
          {t(translation.Settings.EditorNoneFound)}
        </p>
      ) : null}

      {custom ? (
        <p className="font-mono text-[11px] leading-4 text-muted">{command}</p>
      ) : null}
    </div>
  );
}

function EditorChip({
  label,
  selected,
  onSelect
}: Readonly<{ label: string; selected: boolean; onSelect: () => void }>) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={clsx(
        "h-8 rounded-lg border px-3 text-xs font-medium transition-colors",
        selected
          ? "border-accent/50 bg-accent/[0.08] text-text"
          : "border-border bg-bg/45 text-muted hover:border-accent/40 hover:text-text"
      )}
    >
      {label}
    </button>
  );
}
