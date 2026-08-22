import clsx from "clsx";
import { forwardRef } from "react";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";

export type FieldVariant = "default" | "inverse";
export type FieldSize = "sm" | "md" | "lg";

interface SharedFieldProps {
  icon?: UiIconName;
  variant?: FieldVariant;
  size?: FieldSize;
  wrapperClassName?: string;
}

const wrapperVariantClassName: Record<FieldVariant, string> = {
  default: "border border-border bg-bg text-text focus-within:border-accent focus-within:ring-2 focus-within:ring-accentSoft",
  inverse: "border border-cyan-300/30 bg-black/30 text-slate-50 focus-within:border-cyan-200/60 focus-within:ring-2 focus-within:ring-cyan-400/20"
};

const iconVariantClassName: Record<FieldVariant, string> = {
  default: "text-muted",
  inverse: "text-cyan-200"
};

const sizeClassName: Record<FieldSize, string> = {
  sm: "min-h-[34px] rounded-lg px-2 py-1 text-sm",
  md: "min-h-10 rounded-xl px-3 py-2 text-sm",
  lg: "min-h-[52px] rounded-2xl px-4 py-3 text-sm"
};

const iconSizeClassName: Record<FieldSize, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5"
};

/**
 * The border, background, radius and padding every input-shaped control shares.
 *
 * Exported so a control that is not an `<input>` — a row that opens a file
 * dialog, a slot showing a picked image — can look like one without copying the
 * classes. Copies drift: change `sizeClassName.sm` and a hand-rolled row keeps
 * the old padding while the `TextInput` beside it moves.
 */
export function fieldChromeClassName(
  variant: FieldVariant = "default",
  size: FieldSize = "lg"
): string {
  // `outline-none` belongs here rather than on each caller: worn by a bare
  // input, select or textarea, this chrome would otherwise keep the browser's
  // own focus ring — a blue-white outline in none of the app's palettes, and
  // one that gets clipped wherever a field sits against a scrolling edge. On a
  // wrapper element it costs nothing, since a div has no outline to begin with.
  return clsx("outline-none", wrapperVariantClassName[variant], sizeClassName[size]);
}

function FieldShell({
  children,
  icon,
  variant = "default",
  size = "lg",
  wrapperClassName
}: SharedFieldProps & { children: React.ReactNode }) {
  return (
    <div
      className={clsx(
        "flex w-full items-center gap-3 transition-[border-color,box-shadow] duration-200",
        fieldChromeClassName(variant, size),
        wrapperClassName
      )}
    >
      {icon ? (
        <UiIcon
          name={icon}
          className={clsx("shrink-0", iconSizeClassName[size], iconVariantClassName[variant])}
        />
      ) : null}
      {children}
    </div>
  );
}

export interface TextInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    SharedFieldProps {
  inputClassName?: string;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput(
    {
      className,
      disabled,
      icon,
      inputClassName,
      size = "lg",
      type = "text",
      variant = "default",
      wrapperClassName,
      ...props
    },
    ref
  ) {
    return (
      <FieldShell
        icon={icon}
        variant={variant}
        size={size}
        wrapperClassName={clsx(disabled ? "cursor-not-allowed opacity-60" : "", className, wrapperClassName)}
      >
        <input
          {...props}
          ref={ref}
          type={type}
          disabled={disabled}
          className={clsx(
            "w-full border-0 bg-transparent p-0 outline-none placeholder:text-muted disabled:cursor-not-allowed",
            variant === "inverse" ? "text-slate-50 placeholder:text-slate-400" : "text-text",
            props.readOnly ? "cursor-default" : "",
            inputClassName
          )}
        />
      </FieldShell>
    );
  }
);

export interface SelectInputProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size">,
    SharedFieldProps {
  selectClassName?: string;
}

export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(
  function SelectInput(
    {
      children,
      className,
      disabled,
      icon,
      selectClassName,
      size = "lg",
      variant = "default",
      wrapperClassName,
      ...props
    },
    ref
  ) {
    return (
      <FieldShell
        icon={icon}
        variant={variant}
        size={size}
        wrapperClassName={clsx(disabled ? "cursor-not-allowed opacity-60" : "", className, wrapperClassName)}
      >
        <select
          {...props}
          ref={ref}
          disabled={disabled}
          className={clsx(
            "w-full border-0 bg-transparent p-0 outline-none disabled:cursor-not-allowed",
            variant === "inverse" ? "text-slate-50" : "text-text",
            selectClassName
          )}
        >
          {children}
        </select>
      </FieldShell>
    );
  }
);
