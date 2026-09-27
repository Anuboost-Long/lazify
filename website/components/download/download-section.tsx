import { site } from "@/lib/site";

import { MacDownloadCard, MacTrustNote } from "./mac-download";
import { WindowsDownloadCard, WindowsTrustNote } from "./windows-download";

export function DownloadSection() {
	return (
		<section
			id="download"
			className="scroll-mt-20 border-t border-white/8 bg-[#0b1411] px-5 py-24 sm:px-8 lg:py-32"
		>
			<div className="mx-auto max-w-7xl">
				<h2 className="max-w-3xl font-display text-4xl font-semibold leading-[1.02] tracking-[-.015em] text-[#f4f3ed] sm:text-6xl">
					Pick your platform
				</h2>
				<p className="mt-6 max-w-xl text-base leading-7 text-stone-400">
					Both builds ship from the same public releases repo.
				</p>

				<div className="mt-12 grid gap-5 lg:grid-cols-2">
					<MacDownloadCard />
					<WindowsDownloadCard />
				</div>

				{/* Both platforms warn on an unsigned build, so both get the same
            reassurance in the same shape — the fix sits at the foot of each
            card, aligned, whether it is a command or two clicks. */}
				<div className="mt-5 grid gap-5 lg:grid-cols-2">
					<MacTrustNote />
					<WindowsTrustNote />
				</div>

				<p className="mt-10 text-sm text-stone-400">
					Looking for an older version? See{" "}
					<a
						href={site.releases}
						target="_blank"
						rel="noreferrer"
						className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white"
					>
						all releases on GitHub
					</a>.
				</p>
			</div>
		</section>
	);
}
