import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { fieldChromeClassName } from "@renderer/shared/ui/form/FormInput";

interface EnvValueEditorProps {
  value: string;
  onChange: (next: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  autoFocus?: boolean;
}

/**
 * The value field, as a wrapping box rather than a one-line input.
 *
 * The list truncates every value to one line to stay scannable, so editing is
 * the only place the whole thing can be read — a connection string scrolled
 * sideways inside a 280px input would just move the problem.
 *
 * Newlines are stripped on the way in. A .env assignment lives on one line, and
 * a pasted multi-line secret would otherwise be written back as a quoted value
 * spanning lines, which the reader refuses to parse — the variable would vanish
 * from the panel on the next read.
 */
export function EnvValueEditor({
  value,
  onChange,
  onCommit,
  onCancel,
  autoFocus = false
}: Readonly<EnvValueEditorProps>) {
  const { t } = useTranslation();

  return (
    <div className={fieldChromeClassName("default", "sm")}>
      <textarea
        value={value}
        rows={3}
        autoFocus={autoFocus}
        spellCheck={false}
        aria-label={t(translation.EnvPane.Value)}
        placeholder={t(translation.EnvPane.ValuePlaceholder)}
        className="w-full resize-none break-all border-0 bg-transparent p-0 font-mono text-xs text-text outline-none placeholder:text-muted"
        onChange={(event) => onChange(event.target.value.replace(/[\r\n]+/g, ""))}
        onKeyDown={(event) => {
          // Enter commits rather than opening a line the file cannot hold.
          if (event.key === "Enter") {
            event.preventDefault();
            onCommit();
          }
          if (event.key === "Escape") onCancel();
        }}
      />
    </div>
  );
}
