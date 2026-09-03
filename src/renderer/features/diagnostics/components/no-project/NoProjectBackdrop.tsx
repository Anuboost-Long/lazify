export function NoProjectBackdrop() {
	return (
		<div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
			<div className="absolute -left-14 -top-10 h-48 w-48 rotate-12 rounded-[36px] border border-border" />
			<div className="absolute -right-16 -top-16 h-44 w-44 rounded-full border border-border" />
			<div className="absolute -bottom-20 -right-10 h-36 w-36 -rotate-6 rounded-[24px] border border-accent/20 bg-accent/[0.04]" />

			<div className="absolute -left-6 bottom-8 h-2.5 w-16 -rotate-6 rounded-full bg-border" />

			<div className="absolute right-6 top-6 grid grid-cols-3 gap-1.5">
				{Array.from({ length: 9 }).map((_, index) => (
					<span key={index} className="h-1 w-1 rounded-full bg-muted/30" />
				))}
			</div>
		</div>
	);
}
