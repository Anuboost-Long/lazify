import clsx from "clsx";

interface SwitchProps {
  checked: boolean;
  /** Required: the control is a bare track, so this is its only accessible name. */
  label: string;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  /**
   * `quiet` keeps the track neutral and colours only the knob. In a list where
   * nearly every switch is on, a filled accent track per row turns the default
   * state into the loudest thing on screen.
   */
  tone?: "accent" | "quiet";
}

/** A small on/off track, for a row that toggles something rather than opening it. */
export function Switch({
  checked,
  label,
  onChange,
  disabled = false,
  tone = "accent"
}: Readonly<SwitchProps>) {
  return (
    <label
      className={clsx(
        "relative inline-flex shrink-0 items-center",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
        aria-label={label}
      />
      <span
        className={clsx(
          "h-4 w-7 rounded-full border",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40",
          tone === "quiet"
            ? "border-border bg-text/[0.06]"
            : checked
              ? "border-accent/40 bg-accent/30"
              : "border-border bg-text/[0.08]"
        )}
      />
      <span
        className={clsx(
          "pointer-events-none absolute left-0.5 h-3 w-3 rounded-full",
          "transition-transform duration-300",
          checked ? "translate-x-3 bg-accent" : "translate-x-0 bg-muted"
        )}
      />
    </label>
  );
}
