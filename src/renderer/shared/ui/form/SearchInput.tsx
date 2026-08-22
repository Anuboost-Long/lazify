import clsx from "clsx";
import { forwardRef } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { TextInput, type TextInputProps } from "@renderer/shared/ui/form/FormInput";

export interface SearchInputProps
  extends Omit<TextInputProps, "icon" | "type" | "value" | "onChange" | "children"> {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  clearLabel?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    { className, clearLabel, disabled, label, onValueChange, placeholder, size = "md", value, ...props },
    ref
  ) {
    const { t } = useTranslation();
    const clearable = value.length > 0 && !disabled;

    return (
      <div className={clsx("relative min-w-0", className)}>
        <label className="block">
          <span className="sr-only">{label}</span>
          <TextInput
            {...props}
            ref={ref}
            type="search"
            icon="search"
            size={size}
            disabled={disabled}
            value={value}
            placeholder={placeholder ?? label}
            onChange={(event) => onValueChange(event.target.value)}
            wrapperClassName={clearable ? "pr-1" : undefined}
          />
        </label>

        {clearable ? (
          <button
            type="button"
            aria-label={clearLabel ?? t(translation.GlobalTerm.ClearSearch)}
            onClick={() => onValueChange("")}
            className={clsx(
              "absolute right-2 top-1/2 flex -translate-y-1/2 items-center justify-center",
              "h-6 w-6 rounded-md text-muted transition-colors",
              "hover:bg-text/10 hover:text-text",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accentSoft"
            )}
          >
            <UiIcon name="xmark" className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    );
  }
);
