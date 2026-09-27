import { BrandIcon } from "@/components/brand-icon";
import { DownloadSection } from "@/components/download";
import { DownloadButton } from "@/components/download-button";
import { ProductWindow } from "@/components/product-window";
import { ScreenshotCrop } from "@/components/screenshot-crop";
import { SiteHeader } from "@/components/site-header";
import { site } from "@/lib/site";
import clsx from "clsx";
import { Terminal } from "lucide-react";

/** One real task, in the order it happens — which is why these are numbered. */
const taskSteps = [
	{
		title: "Start the dev server",
		description:
			"Every script in package.json gets a Run button. The output stays attached to the project, not a stray terminal tab.",
		crop: {
			src: "/showcase/project-scripts.png",
			alt: "The scripts list for a project, each with a Run button",
			x: 0.325,
			y: 0.092,
			w: 0.64,
			h: 0.5,
		},
	},
	{
		title: "Hand the code to an agent",
		description:
			"Select the lines that matter and send them to Claude or Codex. The agent is already running in that project's folder.",
		crop: {
			src: "/showcase/code-to-agent.png",
			alt: "Selected code in the editor with a Send to agent button",
			x: 0.325,
			y: 0.1,
			w: 0.44,
			h: 0.42,
		},
	},
	{
		title: "Watch both at once",
		description:
			"The live monitor puts the dev server and every agent session side by side, so you see the fix land while it's being made.",
		crop: {
			src: "/showcase/live-monitor.png",
			alt: "The live monitor showing a dev server and Claude side by side",
			x: 0.07,
			y: 0.185,
			w: 0.59,
			h: 0.405,
		},
	},
];

const extras = [
	{
		label: "Usage limits",
		detail: "How much of your Claude and Codex limits is left, and when each one resets.",
	},
	{
		label: "Stays awake",
		detail: "Your Mac won't sleep while an agent is mid-turn, so a long run doesn't stall overnight.",
	},
	{
		label: "Environment variables",
		detail: "Edit .env entries with the values masked until you choose to reveal them.",
	},
	{
		label: "Project health",
		detail: "Outdated packages and security advisories, listed and ready to hand to an agent.",
	},
	{
		label: "Built-in browser",
		detail: "Docs, GitHub, and your localhost preview open beside the project they belong to.",
	},
	{
		label: "Templates",
		detail: "Start a project from Next.js, Vite, Expo, or React Native, or save your own setup.",
	},
];

export default function Home() {
	return (
		<main id="top" className="overflow-hidden bg-[#08100e] text-stone-100">
			<SiteHeader />

			<section className="px-5 pb-24 pt-36 sm:px-8 lg:pt-44">
				<div className="mx-auto max-w-7xl">
					<div className="max-w-4xl">
						<h1 className="reveal reveal-1 text-balance font-display text-[clamp(2.9rem,6.6vw,6.2rem)] font-semibold leading-[.96] tracking-[-.01em] text-[#f4f3ed]">
							Run Claude and Codex inside the project they&apos;re changing.
						</h1>

						<p className="reveal reveal-2 mt-8 max-w-2xl text-base leading-7 text-stone-400 sm:text-lg sm:leading-8">
							Lazify is a desktop app that gives each project one window: its agents, its dev scripts, a
							browser, and the code. You watch the work happen instead of hunting for the right terminal.
						</p>

						<div className="reveal reveal-3 mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
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
						<p className="reveal reveal-3 mt-4 text-xs text-stone-500">
							For Apple Silicon and Intel Macs. Windows is on the way.
						</p>
					</div>

					<div id="product" className="reveal reveal-4 scroll-mt-28 pt-16 sm:pt-20">
						<ProductWindow />
					</div>
				</div>
			</section>

			<section
				id="features"
				className="scroll-mt-24 border-y border-white/8 bg-[#0b1411] px-5 py-24 sm:px-8 lg:py-32"
			>
				<div className="mx-auto max-w-7xl">
					<h2 className="max-w-3xl font-display text-4xl font-semibold leading-[1.02] tracking-[-.015em] text-[#f4f3ed] sm:text-6xl">
						One task, start to finish
					</h2>
					<p className="mt-6 max-w-xl text-base leading-7 text-stone-400">
						Fixing a bug usually means a terminal for the server, another for the agent, and an editor
						somewhere in between. Here&apos;s the same job in Lazify.
					</p>

					<ol className="mt-16">
						{taskSteps.map((step, index) => (
							<li
								key={step.title}
								className="grid gap-8 border-t border-white/10 py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:py-16"
							>
								<div className="lg:pt-2">
									<span className="font-display text-5xl font-semibold leading-none text-emerald-300">
										{index + 1}
									</span>
									<h3 className="mt-6 font-display text-2xl font-semibold leading-tight text-white sm:text-3xl">
										{step.title}
									</h3>
									<p className="mt-4 max-w-md text-base leading-7 text-stone-400">{step.description}</p>
								</div>
								<ScreenshotCrop {...step.crop} />
							</li>
						))}
					</ol>
				</div>
			</section>

			<section className="px-5 py-24 sm:px-8 lg:py-32">
				<div className="mx-auto max-w-7xl">
					<h2 className="max-w-3xl font-display text-3xl font-semibold leading-tight text-[#f4f3ed] sm:text-4xl">
						Also in the window
					</h2>
					<dl className="mt-12 grid gap-x-12 sm:grid-cols-2 lg:grid-cols-3">
						{extras.map((extra) => (
							<div key={extra.label} className="border-t border-white/10 py-6">
								<dt className="font-semibold text-white">{extra.label}</dt>
								<dd className="mt-2 text-[15px] leading-7 text-stone-400">{extra.detail}</dd>
							</div>
						))}
					</dl>
				</div>
			</section>

			<DownloadSection />

			<section className="px-5 py-16 sm:px-8">
				<div className="mx-auto max-w-7xl">
					<p className="max-w-2xl text-base leading-7 text-stone-400">
						Lazify is built by one developer and is free to download. If it saves you time, you can{" "}
						<a
							href="/donate"
							className="text-rose-200 underline decoration-rose-300/40 underline-offset-4 hover:decoration-rose-200"
						>
							send a coffee with KHQR
						</a>.
					</p>
				</div>
			</section>

			<footer className="px-5 pb-10 pt-6 sm:px-8">
				<div className="mx-auto flex max-w-7xl flex-col gap-6 border-t border-white/8 pt-8 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-2.5 text-sm font-semibold">
						<BrandIcon size={28} className="rounded-lg" /> Lazify
					</div>
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
