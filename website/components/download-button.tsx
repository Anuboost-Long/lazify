import clsx from "clsx";
import { Download } from "lucide-react";
import type { ReactNode } from "react";

interface DownloadButtonProps {
  href: string;
  children: ReactNode;
  /** The filled emerald treatment, for the one action a card leads with. */
  primary?: boolean;
  /** Right-aligned detail — the architecture a build is for, say. */
  hint?: string;
  className?: string;
}

/**
 * A real download link. It was a button that only ever said "coming soon";
 * releases now exist, so it points at one.
 */
export function DownloadButton({
  href,
  children,
  primary = false,
  hint,
  className,
}: Readonly<DownloadButtonProps>) {
  return (
    <a
      href={href}
      className={clsx(
        "group inline-flex min-h-12 items-center justify-center gap-3 rounded-xl",
        primary ? "bg-emerald-300 text-[#07110d]" : "bg-white/[.05] text-white",
        "border",
        primary ? "border-emerald-300" : "border-white/12",
        "px-5 py-3 text-sm font-bold",
        "transition-[transform,background-color] hover:-translate-y-0.5",
        !primary && "hover:bg-white/[.09]",
        className,
      )}
    >
      <Download
        size={16}
        className="shrink-0 opacity-70 transition-transform group-hover:translate-y-0.5"
      />
      {/* The label and its hint stack, so a two-word architecture name does not
          wrap against the hint and leave the pair of buttons uneven. */}
      <span className="flex flex-col items-start leading-tight">
        <span className="whitespace-nowrap">{children}</span>
        {hint ? (
          <span
            className={clsx(
              "font-mono text-[9px] font-medium uppercase tracking-wider whitespace-nowrap",
              primary ? "text-[#07110d]/55" : "text-stone-500",
            )}
          >
            {hint}
          </span>
        ) : null}
      </span>
    </a>
  );
}
