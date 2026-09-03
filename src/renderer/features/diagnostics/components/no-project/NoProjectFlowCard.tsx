import clsx from "clsx";

import UiIcon from "@renderer/shared/ui/icons/UiIcon";

const STEPS = [
	{ marker: "bg-success", width: "w-10" },
	{ marker: "bg-success", width: "w-12" },
	{ marker: "border border-muted/50", width: "w-7" },
];

export function NoProjectFlowCard() {
	return (
		<div aria-hidden="true" className="relative h-[104px] w-[92px] shrink-0">
			<div
				className={clsx(
					"absolute left-3 top-2 h-[88px] w-[68px] -rotate-6 rounded-[14px]",
					"border border-border bg-bg transition-transform duration-300",
					"motion-safe:group-hover:-rotate-12",
				)}
			/>
			<div
				className={clsx(
					"absolute left-1.5 top-1 h-[92px] w-[72px] rotate-3 rounded-[14px]",
					"border border-border bg-soft transition-transform duration-300",
					"motion-safe:group-hover:rotate-6",
				)}
			/>

			<div
				className={clsx(
					"absolute left-0 top-0 h-[96px] w-[76px] rounded-[14px]",
					"border border-accent/25 bg-bg transition-transform duration-300",
					"motion-safe:group-hover:-translate-y-1",
				)}
			>
				<div className="absolute right-0 top-0 h-5 w-5 rounded-bl-[10px] rounded-tr-[13px] border-b border-l border-accent/25 bg-accent/[0.07]" />

				<div className="flex flex-col gap-2.5 p-3 pt-6">
					{STEPS.map((step) => (
						<span key={step.width} className="flex items-center gap-1.5">
							<span className={clsx("h-1.5 w-1.5 shrink-0 rounded-full", step.marker)} />
							<span className={clsx("h-1 rounded-full bg-muted/35", step.width)} />
						</span>
					))}
				</div>

				<div
					className={clsx(
						"absolute -bottom-3 left-3 flex h-8 w-8 items-center justify-center",
						"rounded-[11px] bg-accent text-white shadow-glow",
						"transition-transform duration-300 motion-safe:group-hover:rotate-[6deg]",
					)}
				>
					<UiIcon name="health-cross" className="h-4 w-4" />
				</div>
			</div>
		</div>
	);
}
