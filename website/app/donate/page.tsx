import type { Metadata } from "next";
import { ArrowLeft, Coffee, Heart, ScanLine, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BrandIcon } from "@/components/brand-icon";

export const metadata: Metadata = {
  title: "Support Lazify",
  description: "Scan the KHQR code to buy the Lazify maintainer a coffee and help keep the project going.",
};

const reasons = [
  { icon: Coffee, text: "Fuels late-night debugging sessions" },
  { icon: Sparkles, text: "Keeps new features shipping" },
  { icon: Heart, text: "Goes straight to the person building this" },
];

export default function DonatePage() {
  return (
    <main className="hero-grid relative min-h-screen overflow-hidden bg-[#08100e] px-5 pb-20 pt-6 text-stone-100 sm:px-8">
      <div className="hero-glow pointer-events-none absolute left-1/2 top-0 h-[720px] w-[960px] -translate-x-1/2" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between border-b border-white/10 pb-6">
        <Link href="/" className="flex items-center gap-2.5 text-sm font-semibold text-white">
          <BrandIcon size={30} className="rounded-lg" /> Lazify
        </Link>
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-stone-400 transition-colors hover:text-white">
          <ArrowLeft size={15} /> Back to Lazify
        </Link>
      </header>

      <div className="relative mx-auto mt-16 max-w-3xl text-center">
        <div className="reveal reveal-1 mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/[.06] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.18em] text-emerald-200">
          <Heart size={12} className="text-emerald-300" />
          Support the project
        </div>

        <h1 className="reveal reveal-2 text-balance font-display text-[clamp(2.6rem,6vw,4.6rem)] font-semibold leading-[1.02] tracking-[-.01em] text-[#f4f3ed]">
          If Lazify saves you time,
          <span className="mt-2 block text-emerald-300">consider saving me a coffee.</span>
        </h1>

        <p className="reveal reveal-3 mx-auto mt-6 max-w-xl text-balance text-base leading-7 text-stone-400">
          Lazify is built and maintained independently. Every donation—big or small—goes directly toward keeping it free, fast, and actively developed. Thank you for even considering it.
        </p>
      </div>

      <div className="reveal reveal-4 relative mx-auto mt-14 max-w-2xl">
        <div className="relative overflow-hidden rounded-[30px] border border-emerald-300/20 bg-[#0c1813] p-8 shadow-2xl shadow-black/40 sm:p-12">
          <div className="pointer-events-none absolute -right-16 -top-16 opacity-[.08]"><BrandIcon size={280} /></div>

          <div className="relative grid gap-10 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="mx-auto">
              <div className="rounded-[26px] bg-white p-3 shadow-[0_0_0_1px_rgba(255,255,255,.06),0_30px_70px_-20px_rgba(52,211,153,0.35)] sm:p-4">
                <Image
                  src="/donate-qr.jpg"
                  alt="KHQR payment code for Kimlong Ly"
                  width={903}
                  height={1270}
                  className="h-auto w-[220px] rounded-2xl sm:w-[260px]"
                  priority
                />
              </div>
              <p className="mt-4 flex items-center justify-center gap-1.5 font-mono text-[9px] uppercase tracking-[.16em] text-stone-500">
                <ScanLine size={12} className="text-emerald-300" /> Scan with any KHQR-enabled bank app
              </p>
            </div>

            <div className="text-center sm:text-left">
              <p className="eyebrow">Send appreciation</p>
              <h2 className="mt-3 font-display text-2xl font-semibold text-white">Kimlong Ly</h2>
              <p className="mt-4 text-sm leading-7 text-stone-300">
                Open your banking app, scan the code, and send whatever feels right. No amount is too small—every bit helps keep Lazify moving forward.
              </p>

              <ul className="mt-6 space-y-3">
                {reasons.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center justify-center gap-2.5 text-sm text-stone-400 sm:justify-start">
                    <Icon size={15} className="shrink-0 text-emerald-300" /> {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <p className="reveal reveal-5 mt-8 text-center text-sm leading-7 text-stone-500">
          Whether you donate or not, thank you for using Lazify. Every download, star, and bit of feedback matters just as much. 🌱
        </p>
      </div>
    </main>
  );
}
