import clsx from "clsx";

import { SmallText } from "@renderer/shared/typography";

interface PreviewModeToggleProps<TMode extends string> {
  value: TMode;
  options: ReadonlyArray<{ id: TMode; label: string }>;
  onChange: (value: TMode) => void;
}

/**
 * The segmented control the preview surfaces switch views with — code against
 * picture for an SVG, fit against actual size for an image. Same shape as the
 * diff pane's unified/split switch, so the editor header reads consistently.
 */
export function PreviewModeToggle<TMode extends string>({
  value,
  options,
  onChange,
}: Readonly<PreviewModeToggleProps<TMode>>) {
  return (
    <div className="flex shrink-0 items-center rounded-md border border-border p-0.5">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          aria-pressed={value === option.id}
          className={clsx(
            "rounded px-2 py-0.5 transition-colors",
            value === option.id ? "bg-text/10" : "hover:bg-text/[0.06]"
          )}
        >
          <SmallText as="span" className={value === option.id ? "!text-text" : "!text-muted"}>
            {option.label}
          </SmallText>
        </button>
      ))}
    </div>
  );
}
