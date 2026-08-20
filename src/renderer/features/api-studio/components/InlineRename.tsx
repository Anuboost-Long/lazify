import clsx from "clsx";
import { useState } from "react";

interface InlineRenameProps {
  value: string;
  label: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
}

export function InlineRename({ value, label, onCommit, onCancel }: Readonly<InlineRenameProps>) {
  const [draft, setDraft] = useState(value);

  const commit = () => {
    const name = draft.trim();

    if (name) onCommit(name);
    else onCancel();
  };

  return (
    <input
      autoFocus
      value={draft}
      aria-label={label}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit();
        if (event.key === "Escape") onCancel();
      }}
      className={clsx(
        "h-6 min-w-0 flex-1 rounded-md border border-accent/40 bg-bg px-2",
        "text-xs text-text outline-none"
      )}
    />
  );
}
