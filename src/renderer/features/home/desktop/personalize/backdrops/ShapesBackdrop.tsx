export function ShapesBackdrop() {
	return (
		<div aria-hidden="true" className="absolute inset-0 overflow-hidden text-accent">
			<div className="absolute -right-32 -top-40 h-[520px] w-[520px] rotate-12 rounded-[160px] border border-current opacity-20" />
			<div className="absolute -bottom-48 -left-40 h-[480px] w-[480px] rounded-full border border-current opacity-15" />
			<div className="absolute left-16 top-24 h-[140px] w-[140px] -rotate-6 rounded-[42px] border border-current opacity-20" />
			<div className="absolute bottom-28 right-24 h-3 w-48 -rotate-12 rounded-full bg-current opacity-10" />
			<div className="absolute right-1/3 top-16 h-3 w-24 rotate-12 rounded-full bg-current opacity-10" />

			<div className="absolute right-32 top-48 grid grid-cols-4 gap-3 opacity-25">
				{Array.from({ length: 16 }).map((_, index) => (
					<span key={index} className="h-1 w-1 rounded-full bg-current" />
				))}
			</div>
		</div>
	);
}
