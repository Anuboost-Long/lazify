"use client";

import clsx from "clsx";
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

interface CopyCommandProps {
  /** The command actually copied to the clipboard. */
  command: string;
  /** Shorter text to show, when the real command is too long for the box. */
  display?: string;
  className?: string;
}

export function CopyCommand({
  command,
  display,
  className,
}: Readonly<CopyCommandProps>) {
  const [copied, setCopied] = useState(false);

  // Let the "Copied" state fall back on its own rather than leaving it stuck.
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className={clsx(
        "flex items-center gap-3 rounded-xl",
        "bg-black/30",
        "border border-white/10",
        "p-2 pl-4 font-mono text-sm",
        className,
      )}
    >
      <code className="min-w-0 flex-1 truncate text-stone-300">
        <span className="mr-2 text-emerald-300">$</span>
        {display ?? command}
      </code>

      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy command"}
        className={clsx(
          "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg",
          "bg-white/[.06] hover:bg-white/[.12]",
          "border border-white/10",
          "px-3 text-xs font-semibold text-stone-300 hover:text-white",
          "transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70",
        )}
      >
        {copied ? (
          <Check size={15} className="text-emerald-300" />
        ) : (
          <Copy size={15} />
        )}
        <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
      </button>
    </div>
  );
}
