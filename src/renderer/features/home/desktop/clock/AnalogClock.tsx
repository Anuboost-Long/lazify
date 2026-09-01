import clsx from "clsx";

interface AnalogClockProps {
	now: Date;
	className?: string;
}

const HOUR_MARKS = Array.from({ length: 12 }, (_, index) => index);

export function AnalogClock({ now, className }: Readonly<AnalogClockProps>) {
	const seconds = now.getSeconds();
	const minutes = now.getMinutes() + seconds / 60;
	const hours = (now.getHours() % 12) + minutes / 60;

	const hand = (turns: number, length: number, width: number, className: string) => (
		<line
			x1="50"
			y1="50"
			x2="50"
			y2={50 - length}
			strokeWidth={width}
			strokeLinecap="round"
			transform={`rotate(${turns * 360} 50 50)`}
			className={className}
		/>
	);

	return (
		<svg
			viewBox="0 0 100 100"
			role="img"
			aria-label={now.toLocaleTimeString()}
			className={clsx("h-full w-full", className)}
		>
			<circle cx="50" cy="50" r="47" className="fill-none stroke-border" strokeWidth="0.6" />

			{HOUR_MARKS.map((mark) => (
				<line
					key={mark}
					x1="50"
					y1="7"
					x2="50"
					y2={mark % 3 === 0 ? "13" : "10"}
					strokeWidth={mark % 3 === 0 ? 1.6 : 0.8}
					strokeLinecap="round"
					transform={`rotate(${mark * 30} 50 50)`}
					className="stroke-muted"
				/>
			))}

			{hand(hours / 12, 24, 3, "stroke-text")}
			{hand(minutes / 60, 34, 2.2, "stroke-text")}
			{hand(seconds / 60, 38, 1, "stroke-accent")}

			<circle cx="50" cy="50" r="2" className="fill-accent" />
		</svg>
	);
}
