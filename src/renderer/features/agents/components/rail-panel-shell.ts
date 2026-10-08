import clsx from "clsx";

export type RailPanelVariant = "rail" | "modal";

export function railPanelShell(variant: RailPanelVariant = "rail") {
  return clsx(
    "flex flex-col overflow-hidden bg-text/[0.02]",
    variant === "modal" ? "modal-rail-panel max-h-[calc(100vh-4rem)] w-full" : "w-72 shrink-0 border-l border-border"
  );
}
