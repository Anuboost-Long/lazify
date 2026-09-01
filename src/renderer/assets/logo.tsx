import type { SVGProps } from "react";

interface LogoProps extends SVGProps<SVGSVGElement> {
	size?: number;
	/** Color for the folder body and file-tree structure */
	color?: string;
	/** Color for the lightning-bolt accent element */
	boltColor?: string;
}

export function Logo({
	size = 24,
	color = "currentColor",
	boltColor = "currentColor",
	className,
	...props
}: Readonly<LogoProps>) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			{...props}
		>
			{/* Folder body */}
			<path
				d="M2.5 7.5 C2.5 6.67 3.17 6 4 6 L8 6 C8.3 6 8.55 6.15 8.72 6.38 L9.5 7.5 L20 7.5 C20.83 7.5 21.5 8.17 21.5 9 L21.5 19 C21.5 19.83 20.83 20.5 20 20.5 L4 20.5 C3.17 20.5 2.5 19.83 2.5 19 Z"
				fill={color}
				fillOpacity="0.12"
				stroke={color}
				strokeWidth="1"
				strokeLinejoin="round"
			/>

			{/* Vertical tree spine */}
			<line x1="6" y1="10.5" x2="6" y2="17.5" stroke={color} strokeWidth="1" strokeLinecap="round" />

			{/* Branch 1 — horizontal + node */}
			<line x1="6" y1="10.5" x2="9" y2="10.5" stroke={color} strokeWidth="1" strokeLinecap="round" />
			<rect
				x="9"
				y="9.5"
				width="3.5"
				height="2"
				rx="0.4"
				fill={color}
				fillOpacity="0.25"
				stroke={color}
				strokeWidth="0.6"
			/>

			{/* Branch 2 — horizontal + node */}
			<line x1="6" y1="13" x2="8.5" y2="13" stroke={color} strokeWidth="1" strokeLinecap="round" />
			<rect
				x="8.5"
				y="12"
				width="3"
				height="2"
				rx="0.4"
				fill={color}
				fillOpacity="0.25"
				stroke={color}
				strokeWidth="0.6"
			/>

			{/* Branch 3 — horizontal + node */}
			<line x1="6" y1="15.5" x2="8.5" y2="15.5" stroke={color} strokeWidth="1" strokeLinecap="round" />
			<rect
				x="8.5"
				y="14.5"
				width="2.5"
				height="2"
				rx="0.4"
				fill={color}
				fillOpacity="0.25"
				stroke={color}
				strokeWidth="0.6"
			/>

			{/* Branch 4 — horizontal + double node */}
			<line
				x1="6"
				y1="17.5"
				x2="12.5"
				y2="17.5"
				stroke={color}
				strokeWidth="1"
				strokeLinecap="round"
			/>
			<rect
				x="12.5"
				y="16.5"
				width="3.5"
				height="2"
				rx="0.4"
				fill={color}
				fillOpacity="0.25"
				stroke={color}
				strokeWidth="0.6"
			/>
			<rect
				x="16.5"
				y="16.5"
				width="3"
				height="2"
				rx="0.4"
				fill={color}
				fillOpacity="0.18"
				stroke={color}
				strokeWidth="0.6"
			/>

			{/* Lightning bolt — accent element */}
			<polygon
				points="15,3 12,8.5 14.2,8.5 11.5,14 17.5,7.5 15,7.5"
				fill={boltColor}
				stroke={boltColor}
				strokeWidth="0.3"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
		</svg>
	);
}

export default Logo;
