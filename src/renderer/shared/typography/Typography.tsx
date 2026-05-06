import { normalizeLanguage } from "@renderer/i18n/i18n";
import clsx from "clsx";
import {
  createElement,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";

type TypographyTone =
  | "text"
  | "muted"
  | "accent"
  | "success"
  | "warning"
  | "error"
  | "inherit";

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

type TypographyProps<TElement extends ElementType> =
  TypographyOwnProps<TElement> &
    Omit<
      ComponentPropsWithoutRef<TElement>,
      keyof TypographyOwnProps<TElement>
    >;

type TypographyShortcutProps = Omit<TypographyProps<ElementType>, "variant">;

const variantClassNames: Record<TypographyVariant, string> = {
  pageTitle: "font-display text-4xl text-text md:text-5xl",
  pageDescription: "text-sm text-muted",
  sectionTitle: "text-2xl font-semibold text-text",
  cardTitle: "text-lg font-semibold text-text",
  body: "text-sm text-text",
  bodySmall: "text-xs text-muted",
  caption: "text-[11px] text-muted",
  overline: "text-xs font-semibold uppercase tracking-[0.24em] text-accent",
  pill: "text-[10px] font-semibold uppercase tracking-[0.18em] text-muted",
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

function removeTrackingClassNames(value?: string) {
  return value
    ?.split(/\s+/)
    .filter((className) => className && !className.startsWith("tracking-"))
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
  const isKhmer =
    normalizeLanguage(i18n.resolvedLanguage ?? i18n.language) === "kh";
  const Component = as ?? "p";
  const resolvedClassName = clsx(
    isKhmer
      ? removeTrackingClassNames(variantClassNames[variant])
      : variantClassNames[variant],
    tone ? toneClassNames[tone] : null,
    isKhmer ? removeTrackingClassNames(className) : className
  );

  return createElement(
    Component,
    { className: resolvedClassName, ...props },
    children
  );
}

export function PageTitle({
  as = "h2",
  children,
  ...props
}: TypographyShortcutProps) {
  return (
    <Typography as={as} variant="pageTitle" {...props}>
      {children}
    </Typography>
  );
}

export function PageDescription({
  as = "div",
  children,
  ...props
}: TypographyShortcutProps) {
  return (
    <Typography as={as} variant="pageDescription" {...props}>
      {children}
    </Typography>
  );
}

export function SectionTitle({
  as = "h3",
  children,
  ...props
}: TypographyShortcutProps) {
  return (
    <Typography as={as} variant="sectionTitle" {...props}>
      {children}
    </Typography>
  );
}

export function CardTitle({
  as = "p",
  children,
  ...props
}: TypographyShortcutProps) {
  return (
    <Typography as={as} variant="cardTitle" {...props}>
      {children}
    </Typography>
  );
}

export function BodyText({
  as = "p",
  children,
  ...props
}: TypographyShortcutProps) {
  return (
    <Typography as={as} variant="body" {...props}>
      {children}
    </Typography>
  );
}

export function SmallText({
  as = "p",
  children,
  ...props
}: TypographyShortcutProps) {
  return (
    <Typography as={as} variant="bodySmall" {...props}>
      {children}
    </Typography>
  );
}

export function CaptionText({
  as = "p",
  children,
  ...props
}: TypographyShortcutProps) {
  return (
    <Typography as={as} variant="caption" {...props}>
      {children}
    </Typography>
  );
}

export function OverlineText({
  as = "p",
  children,
  ...props
}: TypographyShortcutProps) {
  return (
    <Typography as={as} variant="overline" {...props}>
      {children}
    </Typography>
  );
}

export function PillText({
  as = "span",
  children,
  ...props
}: TypographyShortcutProps) {
  return (
    <Typography as={as} variant="pill" {...props}>
      {children}
    </Typography>
  );
}

export function MonoText({
  as = "p",
  children,
  ...props
}: TypographyShortcutProps) {
  return (
    <Typography as={as} variant="mono" {...props}>
      {children}
    </Typography>
  );
}
