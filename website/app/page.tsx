import { BrandIcon } from "@/components/brand-icon";
import { DownloadSection } from "@/components/download";
import { DownloadButton } from "@/components/download-button";
import { ProductWindow } from "@/components/product-window";
import { SiteHeader } from "@/components/site-header";
import { site } from "@/lib/site";
import clsx from "clsx";
import {
	ArrowRight,
	Bot,
	Boxes,
	Heart,
	LayoutGrid,
	MonitorPlay,
	Network,
	ScanSearch,
	ShieldCheck,
	Sparkles,
	Terminal,
	TerminalSquare,
	Wrench,
} from "lucide-react";

const capabilities = [
	{
		icon: Bot,
		title: "Agents that work where your code lives",
		description:
			"Run Claude, Codex, or your own CLI agent inside the project it is changing. Sessions, files, diffs, and how much of your rate limit is left all stay in one place.",
	},
	{
		icon: MonitorPlay,
		title: "Run it and watch it in the same window",
		description:
			"Start your dev script, open the port it just printed, and keep the running app beside the agent doing the work.",
	},
	{
		icon: ScanSearch,
		title: "Findings become work, not a backlog",
		description:
			"SonarQube for IDE reads the project, and a scan splits into phased tasks an agent can pick up one at a time.",
	},
];

const workspaceFeatures = [
	{
		icon: TerminalSquare,
		label: "Integrated terminals",
		detail: "Agents and scripts stay scoped to the right project.",
	},
	{
		icon: LayoutGrid,
		label: "Live monitor",
		detail: "Every agent and dev server, from every project, on one grid.",
	},
	{
		icon: Network,
		label: "API Studio",
		detail: "Routes read from your source, linked to the line that defines them.",
	},
	{
		icon: Sparkles,
		label: "Prompt presets",
		detail: "The same task becomes the same instructions every time.",
	},
	{
		icon: Boxes,
		label: "Reusable project templates",
		detail: "Start from maintained stacks or save your own baseline.",
	},
	{
		icon: Wrench,
		label: "Local toolchain",
		detail: "Runtimes, package managers, and agent CLIs with their versions.",
	},
	{
		icon: ShieldCheck,
		label: "Bounded autopilot",
		detail: "Routine prompts move forward; risky decisions still wait for you.",
	},
];

export default function Home() {
	return (
		<main id="top" className="overflow-hidden bg-[#08100e] text-stone-100">
			<SiteHeader />

			<section className="hero-grid relative px-5 pb-24 pt-40 sm:px-8 lg:pt-48">
				<div className="hero-glow pointer-events-none absolute left-1/2 top-0 h-180 w-240 -translate-x-1/2" />
				<div className="relative mx-auto max-w-7xl">
					<div className="mx-auto max-w-5xl text-center">
						<div className="reveal reveal-1 mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/6 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.18em] text-emerald-200">
							<span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_#6ee7b7]" />{" "}
							Desktop workspace for developers
						</div>

						<h1 className="reveal reveal-2 text-balance font-display text-[clamp(3.4rem,8vw,7.4rem)] font-semibold leading-[.94] tracking-[.005em] text-[#f4f3ed]">
							Build, run, and review. <span className="mt-2 block text-emerald-300">All in Lazify.</span>
						</h1>

						<p className="reveal reveal-3 mx-auto mt-8 max-w-2xl text-balance text-base leading-7 text-stone-400 sm:text-lg">
							One desktop command center for your projects, coding agents, terminals, live previews, code
							analysis, and the API you are building.
						</p>

						<div className="reveal reveal-4 mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
							<DownloadButton href={site.macDownloads[0].href} primary>
								Download for macOS
							</DownloadButton>
							<a
								href="#download"
								className={clsx(
									"inline-flex min-h-12 items-center justify-center gap-3 rounded-xl",
									"bg-white/5 text-white",
									"border border-white/12",
									"px-5 py-3 text-sm font-bold",
									"transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-white/9",
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
						<div className="mt-5 flex flex-col items-center justify-between gap-3 font-mono text-[9px] uppercase tracking-[.16em] text-stone-400 sm:flex-row">
							<span>Explore the actual Lazify workspace</span>
							<span>Swipe · Arrow keys · Scene controls</span>
						</div>
					</div>
				</div>
			</section>

			<section
				id="features"
				className="scroll-mt-24 border-y border-white/8 bg-[#0b1411] px-5 py-28 sm:px-8 lg:py-36"
			>
				<div className="mx-auto max-w-7xl">
					<div className="max-w-3xl">
						<p className="eyebrow">One place to ship from</p>
						<h2 className="mt-6 font-display text-5xl font-semibold leading-[1.02] tracking-[-.015em] text-[#f4f3ed] sm:text-7xl">
							Your development loop,
							<br />
							connected.
						</h2>
						<p className="mt-7 max-w-xl text-sm leading-7 text-stone-400">
							Lazify does not replace your stack. It gives every part of that stack a shared workspace, so
							less time disappears between windows.
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
										"bg-white/2.5",
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
											<h3 className="mt-2 max-w-md font-display text-2xl font-semibold leading-tight text-white">
												{capability.title}
											</h3>
										</div>
										<p className="max-w-2xl text-base leading-7 text-stone-300">{capability.description}</p>
									</div>
								</article>
							);
						})}
					</div>
				</div>
			</section>

			<section className="border-b border-white/8 bg-[#08100e] px-5 py-28 text-stone-100 sm:px-8 lg:py-36">
				<div className="mx-auto max-w-7xl">
					<div className="max-w-3xl">
						<p className="eyebrow">Everything close at hand</p>
						<h2 className="mt-6 font-display text-5xl font-semibold leading-[1.02] tracking-[-.015em] text-[#f4f3ed] sm:text-6xl">
							A complete workspace,
							<br />
							without the clutter.
						</h2>
						<p className="mt-7 max-w-xl text-base leading-7 text-stone-400">
							A local-first workspace built around the way projects actually move—from setup to agent task
							to running result to reviewed change.
						</p>
					</div>

					<div className="mt-14 grid gap-4 md:grid-cols-2">
						{workspaceFeatures.map((feature) => {
							const Icon = feature.icon;
							return (
								<div
									key={feature.label}
									className="rounded-2xl border border-white/10 bg-white/2.5 p-6 sm:p-7"
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

			<DownloadSection />

			<section className="px-5 pb-4 pt-2 sm:px-8">
				<a
					href="/donate"
					className={clsx(
						"mx-auto flex max-w-7xl flex-col items-center gap-4 rounded-2xl sm:flex-row sm:justify-between",
						"border border-rose-300/20 bg-rose-300/5",
						"px-6 py-6 text-center sm:px-8 sm:text-left",
						"transition-colors hover:bg-rose-300/9",
					)}
				>
					<div className="flex items-center gap-4">
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose-300/25 bg-rose-300/10 text-rose-300">
							<Heart size={18} strokeWidth={1.8} />
						</div>
						<div>
							<p className="font-display text-lg font-semibold text-white">Enjoying Lazify?</p>
							<p className="mt-0.5 text-sm text-stone-400">
								Support the person building it—scan a KHQR code and send a coffee.
							</p>
						</div>
					</div>
					<span className="inline-flex items-center gap-2 rounded-xl border border-rose-300/30 px-4 py-2 text-xs font-semibold text-rose-200">
						Donate <ArrowRight size={13} />
					</span>
				</a>
			</section>

			<footer className="px-5 pb-10 pt-6 sm:px-8">
				<div className="mx-auto flex max-w-7xl flex-col gap-6 border-t border-white/8 pt-8 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-2.5 text-sm font-semibold">
						<BrandIcon size={28} className="rounded-lg" /> Lazify
					</div>
					<p className="font-mono text-[9px] uppercase tracking-[.15em] text-stone-600">
						The desktop workspace for shipping software.
					</p>
					<div className="flex flex-wrap items-center gap-5 text-xs text-stone-500">
						<a href="#product" className="hover:text-white">
							Product
						</a>
						<a href="#download" className="hover:text-white">
							Download
						</a>
						<a href="/donate" className="text-rose-300/80 hover:text-rose-200">
							Donate
						</a>
						<a href="/privacy" className="hover:text-white">
							Privacy
						</a>
						<a href="/terms" className="hover:text-white">
							Terms
						</a>
						<a href={site.distRepo} target="_blank" rel="noreferrer" className="hover:text-white">
							GitHub
						</a>
					</div>
				</div>
			</footer>
		</main>
	);
}
