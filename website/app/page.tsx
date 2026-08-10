import clsx from "clsx";
import {
  ArrowRight,
  Bot,
  Boxes,
  Check,
  Clock,
  Code2,
  Eye,
  GitBranch,
  Heart,
  Laptop,
  Monitor,
  MonitorPlay,
  ShieldCheck,
  Terminal,
  TerminalSquare,
  Wrench,
} from "lucide-react";
import { BrandIcon } from "@/components/brand-icon";
import { CopyCommand } from "@/components/copy-command";
import { DownloadButton } from "@/components/download-button";
import { MockReviews } from "@/components/mock-reviews";
import { ProductWindow } from "@/components/product-window";
import { SiteHeader } from "@/components/site-header";
import { site } from "@/lib/site";

const capabilities = [
  {
    icon: Bot,
    title: "Agents that work where your code lives",
    description:
      "Run Codex, Claude, or your own CLI agent inside the project it is changing. Conversations, files, diffs, and usage stay in one place.",
  },
  {
    icon: MonitorPlay,
    title: "Run and preview without leaving",
    description:
      "Launch your dev script, detect its local port, and inspect the result beside the agent doing the work.",
  },
  {
    icon: GitBranch,
    title: "Review every change with context",
    description:
      "Read files, inspect session diffs, switch branches, and understand what changed before anything ships.",
  },
];

const windowsHighlights = [
  "The same agents, terminals, and live preview",
  "Installs to your user profile — no admin rights",
  "Updates in place from Settings → About",
];

const workspaceFeatures = [
  { icon: TerminalSquare, label: "Integrated terminals", detail: "Agents and scripts stay scoped to the right project." },
  { icon: Eye, label: "Live localhost preview", detail: "See the product update while the task is still running." },
  { icon: Boxes, label: "Reusable project templates", detail: "Start from maintained stacks or save your own baseline." },
  { icon: Wrench, label: "Local environment tools", detail: "Runtimes, package managers, dependencies, and ports—visible." },
  { icon: ShieldCheck, label: "Bounded autopilot", detail: "Routine prompts move forward; risky decisions still wait for you." },
  { icon: Code2, label: "Files and diffs", detail: "Open paths from agent output and inspect the exact source." },
];

export default function Home() {
  return (
    <main id="top" className="overflow-hidden bg-[#08100e] text-stone-100">
      <SiteHeader />

      <section className="hero-grid relative px-5 pb-24 pt-40 sm:px-8 lg:pt-48">
        <div className="hero-glow pointer-events-none absolute left-1/2 top-0 h-[720px] w-[960px] -translate-x-1/2" />
        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto max-w-5xl text-center">
            <div className="reveal reveal-1 mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/[.06] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.18em] text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_#6ee7b7]" />
              Desktop workspace for developers
            </div>

            <h1 className="reveal reveal-2 text-balance font-display text-[clamp(3.4rem,8vw,7.4rem)] font-semibold leading-[.94] tracking-[.005em] text-[#f4f3ed]">
              Build, run, and review.
              <span className="mt-2 block text-emerald-300">All in Lazify.</span>
            </h1>

            <p className="reveal reveal-3 mx-auto mt-8 max-w-2xl text-balance text-base leading-7 text-stone-400 sm:text-lg">
              One desktop command center for your projects, coding agents, terminals, live previews, templates, and local development tools.
            </p>

            <div className="reveal reveal-4 mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <DownloadButton href={site.macDownloads[0].href} primary>
                Download for macOS
              </DownloadButton>
              <a
                href="#download"
                className={clsx(
                  "inline-flex min-h-12 items-center justify-center gap-3 rounded-xl",
                  "bg-white/[.05] text-white",
                  "border border-white/12",
                  "px-5 py-3 text-sm font-bold",
                  "transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-white/[.09]",
                )}
              >
                <Terminal size={16} className="opacity-70" /> Install from Terminal
              </a>
            </div>
            <p className="reveal reveal-4 mt-4 font-mono text-[9px] uppercase tracking-[.14em] text-stone-600">
              Apple Silicon &amp; Intel · Windows coming soon
            </p>
          </div>

          <div id="product" className="reveal reveal-5 scroll-mt-28 pt-20 sm:pt-24">
            <ProductWindow />
            <div className="mt-5 flex flex-col items-center justify-between gap-3 font-mono text-[9px] uppercase tracking-[.16em] text-stone-600 sm:flex-row">
              <span>The actual Lazify Agents workspace</span>
              <span>Projects · Agents · Preview · Changes · Usage</span>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-24 border-y border-white/[.08] bg-[#0b1411] px-5 py-28 sm:px-8 lg:py-36">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="eyebrow">One place to ship from</p>
            <h2 className="mt-6 font-display text-5xl font-semibold leading-[1.02] tracking-[-.015em] text-[#f4f3ed] sm:text-7xl">
              Your development loop,<br />connected.
            </h2>
            <p className="mt-7 max-w-xl text-sm leading-7 text-stone-400">
              Lazify does not replace your stack. It gives every part of that stack a shared workspace, so less time disappears between windows.
            </p>
          </div>

          <div className="mt-16 space-y-4">
            {capabilities.map((capability, index) => {
              const Icon = capability.icon;
              return (
                <article
                  key={capability.title}
                  className={clsx(
                    "grid items-start gap-6 rounded-2xl sm:grid-cols-[64px_1fr] sm:items-center",
                    "bg-white/[.025]",
                    "border border-white/10",
                    "p-6 sm:p-8",
                  )}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/[.07] text-emerald-300">
                    <Icon size={22} strokeWidth={1.5} />
                  </div>
                  <div className="grid gap-3 lg:grid-cols-[.85fr_1.15fr] lg:items-center lg:gap-12">
                    <div>
                      <span className="font-mono text-[9px] text-emerald-300/70">0{index + 1}</span>
                      <h3 className="mt-2 max-w-md font-display text-2xl font-semibold leading-tight text-white">{capability.title}</h3>
                    </div>
                    <p className="max-w-2xl text-base leading-7 text-stone-300">{capability.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-white/[.08] bg-[#08100e] px-5 py-28 text-stone-100 sm:px-8 lg:py-36">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
              <p className="eyebrow">Everything close at hand</p>
              <h2 className="mt-6 font-display text-5xl font-semibold leading-[1.02] tracking-[-.015em] text-[#f4f3ed] sm:text-6xl">
                A complete workspace,<br />without the clutter.
              </h2>
              <p className="mt-7 max-w-xl text-base leading-7 text-stone-400">
                A local-first workspace built around the way projects actually move—from setup to agent task to running result to reviewed change.
              </p>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-2">
              {workspaceFeatures.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.label}
                    className="rounded-2xl border border-white/10 bg-white/[.025] p-6 sm:p-7"
                  >
                    <Icon size={20} strokeWidth={1.6} className="text-emerald-300" />
                    <h3 className="mt-6 font-display text-xl font-semibold text-white">{feature.label}</h3>
                    <p className="mt-3 max-w-md text-[15px] leading-7 text-stone-400">{feature.detail}</p>
                  </div>
                );
              })}
          </div>
        </div>
      </section>

      <MockReviews />

      <section id="download" className="scroll-mt-20 px-5 py-10 sm:px-8 lg:py-16">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[30px] border border-emerald-300/20 bg-[#0c1813] px-6 py-14 sm:px-10 lg:px-16 lg:py-20">
          <div className="pointer-events-none absolute -right-20 -top-24 opacity-[.08]"><BrandIcon size={390} /></div>
          <div className="relative">
            <div className="flex items-center gap-3"><BrandIcon size={50} className="rounded-xl" /><span className="font-mono text-[10px] uppercase tracking-[.18em] text-emerald-300">Lazify Desktop</span></div>
            <h2 className="mt-8 max-w-3xl font-display text-5xl font-semibold leading-[1.02] tracking-[-.015em] text-white sm:text-7xl">
              Pick your platform.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-stone-300">
              Both builds ship from the same public releases repo.
            </p>
          </div>

          <div className="relative mt-12 grid gap-5 lg:grid-cols-2">
            <article className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[.03] p-7 sm:p-8">
              <header className="flex items-center gap-4">
                <span className="inline-flex size-12 items-center justify-center rounded-xl border border-white/10 bg-white/[.05]">
                  <Laptop size={22} strokeWidth={1.6} className="text-emerald-300" />
                </span>
                <div>
                  <h3 className="font-display text-2xl font-semibold text-white">macOS</h3>
                  <p className="text-sm text-stone-400">Monterey 12.0 or later</p>
                </div>
              </header>

              {/* A thin build per architecture, so the choice cannot be hidden
                  behind one button the way a universal binary allows. */}
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {site.macDownloads.map((build, index) => (
                  <DownloadButton
                    key={build.label}
                    href={build.href}
                    primary={index === 0}
                    hint={build.hint}
                    className="w-full"
                  >
                    {build.label}
                  </DownloadButton>
                ))}
              </div>

              <div className="mt-7 flex-1">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[.14em] text-stone-500">
                  or install from Terminal
                </p>
                <CopyCommand
                  command={site.installCommand}
                  display="curl -fsSL …/install.sh | bash"
                />
              </div>

              <p className="mt-6 text-sm leading-relaxed text-stone-400">
                The one-line installer picks the right build for your Mac and clears
                the quarantine flag for you — which is exactly why it&apos;s the
                route we recommend.
              </p>
            </article>

            <article className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[.03] p-7 sm:p-8">
              <header className="flex items-center gap-4">
                <span className="inline-flex size-12 items-center justify-center rounded-xl border border-white/10 bg-white/[.05]">
                  <Monitor size={22} strokeWidth={1.6} className="text-emerald-300" />
                </span>
                <div>
                  <h3 className="font-display text-2xl font-semibold text-white">Windows</h3>
                  <p className="text-sm text-stone-400">Windows 10 or later · x64</p>
                </div>
              </header>

              {site.windowsReleased ? (
                <DownloadButton href={site.latestRelease} className="mt-7 w-full">
                  Download the installer
                </DownloadButton>
              ) : (
                <div className="mt-7 flex min-h-12 items-center justify-center gap-2.5 rounded-xl border border-dashed border-white/12 px-5 py-3 text-sm font-semibold text-stone-400">
                  <Clock size={15} className="text-stone-500" /> Build in progress
                </div>
              )}

              <div className="mt-7 flex-1">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[.14em] text-stone-500">
                  what you get
                </p>
                <ul className="space-y-2.5">
                  {windowsHighlights.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed text-stone-300">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-300" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="mt-6 text-sm leading-relaxed text-stone-400">
                The Windows installer is built on Windows for its native terminal
                module, so it follows shortly behind the macOS release.
              </p>
            </article>
          </div>

          <div className="relative mt-5 rounded-2xl border border-white/10 bg-white/[.03] p-7 sm:p-8">
            <h3 className="font-display text-lg font-semibold text-white">
              ⚠️ macOS says the app is &ldquo;damaged&rdquo;?
            </h3>
            <p className="mt-2.5 max-w-3xl text-[15px] leading-7 text-stone-400">
              Your download is fine. Lazify is signed ad-hoc rather than with a paid
              Apple Developer ID certificate, and macOS reports that as damage for
              anything arriving through a browser. Clear the flag once:
            </p>
            <CopyCommand command={site.quarantineCommand} className="mt-5 max-w-2xl" />
          </div>

          <div className="relative mt-14 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-white/10 pt-6 font-mono text-[9px] uppercase tracking-[.12em] text-stone-500">
            {["Local-first", "Electron desktop app", "Apple Silicon + Intel"].map((item) => <span key={item} className="flex items-center gap-1.5"><Check size={11} className="text-emerald-300" /> {item}</span>)}
            <a href={site.releases} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 transition-colors hover:text-white">
              All releases <ArrowRight size={11} />
            </a>
          </div>
        </div>
      </section>

      <section className="px-5 pb-4 pt-2 sm:px-8">
        <a
          href="/donate"
          className={clsx(
            "mx-auto flex max-w-7xl flex-col items-center gap-4 rounded-2xl sm:flex-row sm:justify-between",
            "border border-rose-300/20 bg-rose-300/[.05]",
            "px-6 py-6 text-center sm:px-8 sm:text-left",
            "transition-colors hover:bg-rose-300/[.09]",
          )}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose-300/25 bg-rose-300/10 text-rose-300">
              <Heart size={18} strokeWidth={1.8} />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-white">Enjoying Lazify?</p>
              <p className="mt-0.5 text-sm text-stone-400">Support the person building it—scan a KHQR code and send a coffee.</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-xl border border-rose-300/30 px-4 py-2 text-xs font-semibold text-rose-200">
            Donate <ArrowRight size={13} />
          </span>
        </a>
      </section>

      <footer className="px-5 pb-10 pt-6 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 border-t border-white/[.08] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5 text-sm font-semibold"><BrandIcon size={28} className="rounded-lg" /> Lazify</div>
          <p className="font-mono text-[9px] uppercase tracking-[.15em] text-stone-600">The desktop workspace for shipping software.</p>
          <div className="flex flex-wrap items-center gap-5 text-xs text-stone-500"><a href="#product" className="hover:text-white">Product</a><a href="#download" className="hover:text-white">Download</a><a href="/donate" className="text-rose-300/80 hover:text-rose-200">Donate</a><a href="/privacy" className="hover:text-white">Privacy</a><a href="/terms" className="hover:text-white">Terms</a><a href={site.distRepo} target="_blank" rel="noreferrer" className="hover:text-white">GitHub</a></div>
        </div>
      </footer>
    </main>
  );
}
