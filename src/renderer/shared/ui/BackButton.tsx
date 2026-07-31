import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import clsx from "clsx";

interface BackButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Container-less back link: plain pressable text, so it reads as breadcrumb
 * navigation floating above the content rather than a solid pill. The arrow
 * slides back on hover, echoing the app's other nav affordances.
 */
export function BackButton({
  label,
  onClick,
  disabled = false,
  className,
}: Readonly<BackButtonProps>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "group inline-flex w-fit items-center gap-1.5",
        "text-sm font-semibold text-muted transition-colors",
        "hover:text-accent",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      <UiIcon
        name="arrow-left"
        className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5"
      />
      {label}
    </button>
  );
}
