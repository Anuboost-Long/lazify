import clsx from "clsx";
import { forwardRef } from "react";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";

type FieldVariant = "default" | "inverse";
type FieldSize = "md" | "sm";

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
  md: "min-h-[52px] rounded-[18px] px-4 py-3 text-sm",
  sm: "min-h-[34px] rounded-md px-2 py-1 text-sm"
};

function FieldShell({
  children,
  icon,
  variant = "default",
  size = "md",
  wrapperClassName
}: SharedFieldProps & { children: React.ReactNode }) {
  return (
    <div
      className={clsx(
        "flex w-full items-center gap-3 transition-[border-color,box-shadow] duration-200",
        wrapperVariantClassName[variant],
        sizeClassName[size],
        wrapperClassName
      )}
    >
      {icon ? (
        <UiIcon
          name={icon}
          className={clsx(
            "h-4 w-4 shrink-0",
            size === "md" ? "h-5 w-5" : "h-4 w-4",
            iconVariantClassName[variant]
          )}
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
      size = "md",
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
      size = "md",
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
