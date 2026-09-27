import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BrandIcon } from "@/components/brand-icon";

export const metadata: Metadata = {
  title: "Support Lazify",
  description: "Scan the KHQR code to buy the Lazify maintainer a coffee and help keep the project going.",
};

export default function DonatePage() {
  return (
    <main className="min-h-screen bg-[#08100e] px-5 pb-20 pt-6 text-stone-100 sm:px-8">
      <header className="mx-auto flex max-w-6xl items-center justify-between border-b border-white/10 pb-6">
        <Link href="/" className="flex items-center gap-2.5 text-sm font-semibold text-white">
          <BrandIcon size={30} className="rounded-lg" /> Lazify
        </Link>
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-stone-400 transition-colors hover:text-white">
          <ArrowLeft size={15} /> Back to Lazify
        </Link>
      </header>

      <div className="mx-auto mt-16 grid max-w-6xl gap-12 lg:mt-24 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-20">
        <div className="max-w-2xl">
          <h1 className="reveal reveal-1 text-balance font-display text-[clamp(2.6rem,6vw,4.6rem)] font-semibold leading-[1.02] tracking-[-.01em] text-[#f4f3ed]">
            If Lazify saves you time, consider saving me a coffee.
          </h1>

          <p className="reveal reveal-2 mt-8 text-base leading-8 text-stone-400 sm:text-lg">
            Lazify is built and maintained by one developer, and it stays free to download. Donations pay for
            the time that goes into new features and fixes.
          </p>

          <ol className="reveal reveal-3 mt-10 space-y-4 border-t border-white/10 pt-8 text-base leading-7 text-stone-300">
            <li>1. Open any bank app that supports KHQR.</li>
            <li>2. Scan the code and send whatever feels right.</li>
          </ol>

          <p className="reveal reveal-3 mt-10 text-sm leading-7 text-stone-500">
            If you&apos;d rather not donate, a star on GitHub or a note about what&apos;s broken helps just as much.
          </p>
        </div>

        <figure className="reveal reveal-4 justify-self-center lg:justify-self-end">
          <div className="rounded-3xl bg-white p-3 sm:p-4">
            <Image
              src="/donate-qr.jpg"
              alt="KHQR payment code for Kimlong Ly"
              width={903}
              height={1270}
              className="h-auto w-60 rounded-2xl sm:w-72"
              priority
            />
          </div>
          <figcaption className="mt-4 text-center text-sm text-stone-400">
            Paid to <span className="font-semibold text-white">Kimlong Ly</span>
          </figcaption>
        </figure>
      </div>
    </main>
  );
}
