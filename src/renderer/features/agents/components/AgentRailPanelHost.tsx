import clsx from "clsx";
import type { ReactNode } from "react";

import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";

interface AgentRailPanelHostProps {
  asModal: boolean;
  onClose: () => void;
  children: ReactNode;

  size?: "default" | "wide";
  height?: "content" | "fixed";
}

export function AgentRailPanelHost({
  asModal,
  onClose,
  children,
  size = "default",
  height = "content",
}: Readonly<AgentRailPanelHostProps>) {
  if (!asModal) return <>{children}</>;

  return (
    <BaseModal open onClose={onClose}>
      <div
        className={clsx(
          "flex max-h-[calc(100vh-4rem)] max-w-[calc(100vw-2rem)]",
          size === "wide" ? "w-[48rem]" : "w-[26rem]",
          height === "fixed" && "h-[70vh]",
          "overflow-hidden rounded-xl border border-border bg-soft"
        )}
      >
        {children}
      </div>
    </BaseModal>
  );
}
