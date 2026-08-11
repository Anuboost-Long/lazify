import clsx from "clsx";

export type RailPanelVariant = "rail" | "modal";

export function railPanelShell(variant: RailPanelVariant = "rail") {
  return clsx(
    "flex flex-col overflow-hidden bg-text/[0.02]",
    variant === "modal" ? "h-full w-full" : "w-72 shrink-0 border-l border-border"
  );
}
