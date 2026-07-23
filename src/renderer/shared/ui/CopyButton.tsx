import clsx from "clsx";
import { useEffect, useState } from "react";

import { SmallText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface CopyButtonProps {
  /** Resolved lazily, so callers can build the text only when it is asked for. */
  value: string | (() => string);
  label: string;
  copiedLabel: string;
  className?: string;
}

/** How long the button stays in its confirmed state. */
const CONFIRM_MS = 1600;

/** Copies text to the clipboard and says so, then goes back to normal. */
export function CopyButton({ value, label, copiedLabel, className }: Readonly<CopyButtonProps>) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timer = window.setTimeout(() => setCopied(false), CONFIRM_MS);

    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(typeof value === "function" ? value() : value);
        setCopied(true);
      }}
      className={clsx(
        "flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2 py-1",
        "transition-colors hover:bg-text/[0.06]",
        className
      )}
    >
      <UiIcon
        name={copied ? "check-circle" : "import"}
        className={clsx("h-3 w-3", copied ? "text-accent" : "text-muted")}
      />
      <SmallText as="span" className={copied ? "!text-accent" : "!text-muted"}>
        {copied ? copiedLabel : label}
      </SmallText>
    </button>
  );
}
