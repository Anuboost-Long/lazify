import { useState } from "react";
import clsx from "clsx";

interface ToggleSwitchProps {
  enabled: boolean;
}

export function ToggleSwitch({ enabled }: ToggleSwitchProps) {
  const [on, setOn] = useState(enabled);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setOn((value) => !value)}
      className={clsx(
        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent",
        "transition-colors duration-200 focus:outline-none",
        on ? "bg-accent" : "bg-border"
      )}
    >
      <span
        className={clsx(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow",
          "transition duration-200",
          on ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}
