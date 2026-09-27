import { CopyCommand } from "@/components/copy-command";
import { DownloadButton } from "@/components/download-button";
import { site } from "@/lib/site";

export function MacDownloadCard() {
	return (
		<article className="flex h-full min-w-0 flex-col rounded-2xl border border-white/10 bg-white/3 p-7 sm:p-8">
			<header>
				<h3 className="font-display text-2xl font-semibold text-white">macOS</h3>
				<p className="mt-1 text-sm text-stone-400">Monterey 12.0 or later</p>
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
				<p className="mb-3 text-sm text-stone-400">
					Or install from Terminal
				</p>
				<CopyCommand command={site.installCommand} display="curl -fsSL …/install.sh | bash" />
			</div>

			<p className="mt-6 text-sm leading-relaxed text-stone-400">
				The one-line installer picks the right build for your Mac and clears the quarantine flag for you
				— which is exactly why it&apos;s the route we recommend.
			</p>
		</article>
	);
}

export function MacTrustNote() {
	return (
		<div className="flex h-full min-w-0 flex-col rounded-2xl border border-white/10 bg-white/3 p-7 sm:p-8">
			<h3 className="font-display text-lg font-semibold text-white">
				macOS says the app is &ldquo;damaged&rdquo;?
			</h3>
			<p className="mt-3 rounded-lg border border-amber-300/15 bg-amber-300/5 px-4 py-3 text-[13px] leading-6 text-amber-200/70">
				&ldquo;Lazify&rdquo; is damaged and can&apos;t be opened. You should move it to the Trash.
			</p>
			<p className="mt-4 flex-1 text-[15px] leading-7 text-stone-400">
				<span className="font-semibold text-white">Your download is fine.</span> Lazify is signed ad-hoc
				rather than with a paid Apple Developer ID certificate, and macOS reports that as damage for
				anything arriving through a browser. Clear the flag once:
			</p>
			<CopyCommand
				command={site.quarantineCommand}
				display="xattr -dr com.apple.quarantine …"
				className="mt-5"
			/>
		</div>
	);
}
