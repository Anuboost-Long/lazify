import clsx from "clsx";
import { useTranslation } from "react-i18next";
import UiIcon, { type UiIconName } from "./icons/UiIcon";

export type ButtonVariant = "default" | "accent" | "error" | "success";

interface LabelButtonProps {
  /** Translation key — t() is called internally */
  label: string;
  icon?: UiIconName;
  variant?: ButtonVariant;
  /** Replaces the icon with a spinner and disables the button */
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  default: [
    "border-border bg-soft text-muted",
    "hover:border-accent/40 hover:text-text",
    "uppercase tracking-[0.18em]",
  ].join(" "),
  accent: [
    "border-accent/25 bg-accent/8 text-accent",
    "hover:bg-accent/15",
  ].join(" "),
  error: [
    "border-error/30 bg-error/8 text-error",
    "hover:bg-error/15",
  ].join(" "),
  success: [
    "border-success/25 bg-success/8 text-success",
    "hover:bg-success/15",
  ].join(" "),
};

export function LabelButton({
  label,
  icon,
  variant = "default",
  loading = false,
  disabled = false,
  onClick,
  className,
}: LabelButtonProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(
        "flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-3",
        "text-[10px] font-semibold transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-40",
        variantClasses[variant],
        className
      )}
    >
      {loading ? (
        <UiIcon name="refresh-circle" className="h-3 w-3 animate-spin" />
      ) : icon ? (
        <UiIcon name={icon} className="h-3 w-3" />
      ) : null}
      {t(label)}
    </button>
  );
}
