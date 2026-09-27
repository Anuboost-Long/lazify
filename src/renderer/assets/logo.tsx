import type { SVGProps } from "react";

interface LogoProps extends SVGProps<SVGSVGElement> {
	size?: number;
	color?: string;
}

export function Logo({
	size = 24,
	color = "rgb(var(--color-accent, 16 185 129))",
	className,
	...props
}: Readonly<LogoProps>) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="32 32 200 200"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			aria-hidden="true"
			{...props}
		>
			<path
				d="M78 50L206 114C218 120 218 136 206 142L78 206C70 210 60 204 60 195V132L92 148V163L160 128L92 93V124L60 108V61C60 52 70 46 78 50Z"
				fill={color}
			/>
		</svg>
	);
}

export default Logo;
