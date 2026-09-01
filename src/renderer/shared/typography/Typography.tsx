import clsx from "clsx";
import {
	createElement,
	type ComponentPropsWithoutRef,
	type ElementType,
	type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";

import { normalizeLanguage } from "@renderer/i18n/i18n";

type TypographyTone = "text" | "muted" | "accent" | "success" | "warning" | "error" | "inherit";

type TypographyVariant =
	| "pageTitle"
	| "pageDescription"
	| "sectionTitle"
	| "cardTitle"
	| "body"
	| "bodySmall"
	| "caption"
	| "overline"
	| "pill"
	| "mono";

type TypographyOwnProps<TElement extends ElementType> = {
	as?: TElement;
	children: ReactNode;
	className?: string;
	tone?: TypographyTone;
	variant?: TypographyVariant;
};

type TypographyProps<TElement extends ElementType> = TypographyOwnProps<TElement> &
	Omit<ComponentPropsWithoutRef<TElement>, keyof TypographyOwnProps<TElement>>;

type TypographyShortcutProps = Omit<TypographyProps<ElementType>, "variant">;

const variantClassNames: Record<TypographyVariant, string> = {
	pageTitle: "font-display text-4xl text-text md:text-5xl",
	pageDescription: "text-sm text-muted",
	sectionTitle: "font-display text-2xl font-semibold text-text",
	cardTitle: "font-display text-lg font-semibold text-text",
	body: "text-sm text-text",
	bodySmall: "text-xs text-muted",
	caption: "text-[11px] text-muted",
	overline: "font-display text-xs font-semibold uppercase tracking-[0.24em] text-accent",
	pill: "font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-muted",
	mono: "font-mono text-xs text-muted",
};

const toneClassNames: Record<TypographyTone, string> = {
	text: "text-text",
	muted: "text-muted",
	accent: "text-accent",
	success: "text-success",
	warning: "text-warning",
	error: "text-error",
	inherit: "text-inherit",
};

const khmerOverriddenPrefixes = ["tracking-", "leading-"];

function removeKhmerOverriddenClassNames(value?: string) {
	return value
		?.split(/\s+/)
		.filter(
			(className) =>
				className && !khmerOverriddenPrefixes.some((prefix) => className.startsWith(prefix)),
		)
		.join(" ");
}

export function Typography<TElement extends ElementType = "p">({
	as,
	children,
	className,
	tone,
	variant = "body",
	...props
}: TypographyProps<TElement>) {
	const { i18n } = useTranslation();
	const isKhmer = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language) === "kh";
	const Component = as ?? "p";
	const resolvedClassName = clsx(
		isKhmer
			? removeKhmerOverriddenClassNames(variantClassNames[variant])
			: variantClassNames[variant],
		tone ? toneClassNames[tone] : null,
		isKhmer ? removeKhmerOverriddenClassNames(className) : className,
		isKhmer ? "leading-khmer" : null,
	);

	return createElement(Component, { className: resolvedClassName, ...props }, children);
}

export function PageTitle({ as = "h2", children, ...props }: TypographyShortcutProps) {
	return (
		<Typography as={as} variant="pageTitle" {...props}>
			{children}
		</Typography>
	);
}

export function PageDescription({ as = "div", children, ...props }: TypographyShortcutProps) {
	return (
		<Typography as={as} variant="pageDescription" {...props}>
			{children}
		</Typography>
	);
}

export function SectionTitle({ as = "h3", children, ...props }: TypographyShortcutProps) {
	return (
		<Typography as={as} variant="sectionTitle" {...props}>
			{children}
		</Typography>
	);
}

export function CardTitle({ as = "p", children, ...props }: TypographyShortcutProps) {
	return (
		<Typography as={as} variant="cardTitle" {...props}>
			{children}
		</Typography>
	);
}

export function BodyText({ as = "p", children, ...props }: TypographyShortcutProps) {
	return (
		<Typography as={as} variant="body" {...props}>
			{children}
		</Typography>
	);
}

export function SmallText({ as = "p", children, ...props }: TypographyShortcutProps) {
	return (
		<Typography as={as} variant="bodySmall" {...props}>
			{children}
		</Typography>
	);
}

export function CaptionText({ as = "p", children, ...props }: TypographyShortcutProps) {
	return (
		<Typography as={as} variant="caption" {...props}>
			{children}
		</Typography>
	);
}

export function OverlineText({ as = "p", children, ...props }: TypographyShortcutProps) {
	return (
		<Typography as={as} variant="overline" {...props}>
			{children}
		</Typography>
	);
}

export function PillText({ as = "span", children, ...props }: TypographyShortcutProps) {
	return (
		<Typography as={as} variant="pill" {...props}>
			{children}
		</Typography>
	);
}

export function MonoText({ as = "p", children, ...props }: TypographyShortcutProps) {
	return (
		<Typography as={as} variant="mono" {...props}>
			{children}
		</Typography>
	);
}
