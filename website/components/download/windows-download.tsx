import { DownloadButton } from "@/components/download-button";
import { site } from "@/lib/site";
import { Clock, Monitor } from "lucide-react";

const windowsHighlights = [
	"The same agents, terminals, and live preview",
	"Installs to your user profile — no admin rights",
	"Updates in place from Settings → About",
];

export function WindowsDownloadCard() {
	return (
		<article className="flex h-full min-w-0 flex-col rounded-2xl border border-white/10 bg-white/[.03] p-7 sm:p-8">
			<header className="flex items-center gap-4">
				<span className="inline-flex size-12 items-center justify-center rounded-xl border border-white/10 bg-white/[.05]">
					<Monitor size={22} strokeWidth={1.6} className="text-emerald-300" />
				</span>
				<div>
					<h3 className="font-display text-2xl font-semibold text-white">Windows</h3>
					<p className="text-sm text-stone-400">Windows 10 or later</p>
				</div>
			</header>

			{/* Same shape as the macOS card: one button per architecture,
          so neither platform hides the choice behind a single file. */}
			{site.windowsDownloads.length > 0 ? (
				<div className="mt-7 grid gap-3 sm:grid-cols-2">
					{site.windowsDownloads.map((build, index) => (
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
				The Windows installer is built on Windows for its native terminal module, so it follows shortly
				behind the macOS release.
			</p>
		</article>
	);
}

export function WindowsTrustNote() {
	return (
		<div className="flex h-full min-w-0 flex-col rounded-2xl border border-white/10 bg-white/[.03] p-7 sm:p-8">
			<h3 className="font-display text-lg font-semibold text-white">
				<span className="mr-2">⚠️</span>Windows says the publisher is unknown?
			</h3>
			<p className="mt-3 rounded-lg border border-amber-300/15 bg-amber-300/[.05] px-4 py-3 text-[13px] leading-6 text-amber-200/70">
				Windows protected your PC — Microsoft Defender SmartScreen prevented an unrecognised app from
				starting.
			</p>
			<p className="mt-4 flex-1 text-[15px] leading-7 text-stone-400">
				<span className="font-semibold text-white">Your download is fine.</span> Lazify isn&apos;t yet
				signed with a paid code-signing certificate, so Windows has no publisher identity to vouch for.
				This is the same trust gap the macOS build has — just Windows&apos; version of the warning.
			</p>
			{/* No command to copy, so the two clicks take the same slot the
          mac card gives its command, and the pair stay level. */}
			<div className="mt-5 flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 p-2 pl-4 text-sm">
				<span className="text-stone-300">
					Click <span className="font-semibold text-white">More info</span>, then{" "}
					<span className="font-semibold text-white">Run anyway</span>
				</span>
			</div>
		</div>
	);
}
