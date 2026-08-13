import clsx from "clsx";

import type { EnvFileSummary } from "@renderer/shared/types/lazify";
import { MonoText } from "@renderer/shared/typography";

interface EnvFileTabsProps {
  files: EnvFileSummary[];
  selected: string | null;
  onSelect: (name: string) => void;
}

/**
 * The file switcher, shown only when a project has more than one env file.
 *
 * `.env.local` overriding `.env` is the normal arrangement, and which file a
 * variable lives in decides whether it reaches production — so the name is
 * never implicit, even with a single file (the header says which one).
 */
export function EnvFileTabs({ files, selected, onSelect }: Readonly<EnvFileTabsProps>) {
  if (files.length < 2) return null;

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border px-1.5 py-1">
      {files.map((file) => {
        const active = file.name === selected;

        return (
          <button
            key={file.name}
            type="button"
            onClick={() => onSelect(file.name)}
            className={clsx(
              "flex shrink-0 items-center gap-1 rounded-md px-2 py-1 transition-colors",
              active ? "bg-accent/10 text-accent" : "text-muted hover:bg-text/[0.06] hover:text-text"
            )}
          >
            <MonoText as="span" className="!text-inherit text-[11px]">
              {file.name}
            </MonoText>
            <MonoText as="span" className="!text-inherit text-[10px] opacity-60">
              {file.variableCount}
            </MonoText>
          </button>
        );
      })}
    </div>
  );
}
