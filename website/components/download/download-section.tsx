import { BrandIcon } from "@/components/brand-icon";
import { site } from "@/lib/site";
import { ArrowRight, Check } from "lucide-react";

import { MacDownloadCard, MacTrustNote } from "./mac-download";
import { WindowsDownloadCard, WindowsTrustNote } from "./windows-download";

export function DownloadSection() {
	return (
		<section id="download" className="scroll-mt-20 px-5 py-10 sm:px-8 lg:py-16">
			<div className="relative mx-auto max-w-7xl overflow-hidden rounded-[30px] border border-emerald-300/20 bg-[#0c1813] px-6 py-14 sm:px-10 lg:px-16 lg:py-20">
				<div className="pointer-events-none absolute -right-20 -top-24 opacity-[.08]">
					<BrandIcon size={390} />
				</div>
				<div className="relative">
					<div className="flex items-center gap-3">
						<BrandIcon size={50} className="rounded-xl" />
						<span className="font-mono text-[10px] uppercase tracking-[.18em] text-emerald-300">
							Lazify Desktop
						</span>
					</div>
					<h2 className="mt-8 max-w-3xl font-display text-5xl font-semibold leading-[1.02] tracking-[-.015em] text-white sm:text-7xl">
						Pick your platform.
					</h2>
					<p className="mt-6 max-w-xl text-base leading-7 text-stone-300">
						Both builds ship from the same public releases repo.
					</p>
				</div>

				<div className="relative mt-12 grid gap-5 lg:grid-cols-2">
					<MacDownloadCard />
					<WindowsDownloadCard />
				</div>

				{/* Both platforms warn on an unsigned build, so both get the same
            reassurance in the same shape — the fix sits at the foot of each
            card, aligned, whether it is a command or two clicks. */}
				<div className="relative mt-5 grid gap-5 lg:grid-cols-2">
					<MacTrustNote />
					<WindowsTrustNote />
				</div>

				<div className="relative mt-14 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-white/10 pt-6 font-mono text-[9px] uppercase tracking-[.12em] text-stone-500">
					{["Local-first", "Electron desktop app", "Apple Silicon + Intel"].map((item) => (
						<span key={item} className="flex items-center gap-1.5">
							<Check size={11} className="text-emerald-300" /> {item}
						</span>
					))}
					<a
						href={site.releases}
						target="_blank"
						rel="noreferrer"
						className="flex items-center gap-1.5 transition-colors hover:text-white"
					>
						All releases <ArrowRight size={11} />
					</a>
				</div>
			</div>
		</section>
	);
}
