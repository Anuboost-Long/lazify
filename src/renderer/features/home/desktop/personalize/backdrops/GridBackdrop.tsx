import clsx from "clsx";

export function GridBackdrop({ still }: Readonly<{ still: boolean }>) {
	return (
		<div aria-hidden="true" className="absolute inset-0 overflow-hidden">
			<div
				className={clsx("absolute -inset-1/4 bg-grid opacity-70", !still && "animate-drift")}
				style={{ backgroundSize: "48px 48px" }}
			/>
			<div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg" />
			<div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-3xl" />
		</div>
	);
}
