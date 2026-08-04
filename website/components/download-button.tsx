"use client";

import clsx from "clsx";
import { Download, Laptop, Monitor } from "lucide-react";
import { useState } from "react";

interface DownloadButtonProps {
  platform: "macOS" | "Windows";
  primary?: boolean;
  className?: string;
}

export function DownloadButton({
  platform,
  primary = false,
  className,
}: Readonly<DownloadButtonProps>) {
  const [requested, setRequested] = useState(false);
  const PlatformIcon = platform === "macOS" ? Laptop : Monitor;

  return (
    <button
      type="button"
      onClick={() => setRequested(true)}
      className={clsx(
        "group inline-flex min-h-12 items-center justify-center gap-3 rounded-xl",
        primary
          ? "bg-emerald-300 text-[#07110d]"
          : "bg-white/[.05] text-white",
        "border",
        primary ? "border-emerald-300" : "border-white/12",
        "px-5 py-3 text-sm font-bold",
        "transition-[transform,background-color] hover:-translate-y-0.5",
        !primary && "hover:bg-white/[.09]",
        className,
      )}
    >
      <PlatformIcon size={17} strokeWidth={1.7} />
      {requested ? "Installer coming soon" : `Download for ${platform}`}
      {requested ? null : <Download size={14} className="opacity-60 transition-transform group-hover:translate-y-0.5" />}
    </button>
  );
}
