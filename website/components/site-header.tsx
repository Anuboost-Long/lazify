"use client";

import clsx from "clsx";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { BrandIcon } from "./brand-icon";

const links = [
  { label: "Product", href: "#product" },
  { label: "Features", href: "#features" },
  { label: "Download", href: "#download" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
      <nav
        aria-label="Main navigation"
        className={clsx(
          "mx-auto flex max-w-7xl items-center justify-between rounded-2xl",
          "bg-[#0c1412]/80 backdrop-blur-xl",
          "border border-white/10",
          "px-4 py-3 shadow-2xl shadow-black/20 sm:px-5",
        )}
      >
        <a href="#top" className="flex items-center gap-2.5" aria-label="Lazify home">
          <BrandIcon size={30} className="rounded-[7px]" />
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-white">Lazify</span>
          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald-200">Desktop</span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="text-sm text-stone-400 transition-colors hover:text-white">
              {link.label}
            </a>
          ))}
        </div>

        <a
          href="#download"
          className={clsx(
            "hidden items-center rounded-xl md:inline-flex",
            "bg-emerald-300 text-[#08100d]",
            "px-4 py-2 text-xs font-bold",
            "transition-transform hover:-translate-y-0.5",
          )}
        >
          Download Lazify
        </a>

        <button
          type="button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="rounded-lg p-1.5 text-stone-300 md:hidden"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {open ? (
        <div className="mx-auto mt-2 flex max-w-7xl flex-col gap-1 rounded-2xl border border-white/10 bg-[#0c1412] p-2 shadow-2xl md:hidden">
          {links.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-sm text-stone-300 hover:bg-white/5">
              {link.label}
            </a>
          ))}
        </div>
      ) : null}
    </header>
  );
}
