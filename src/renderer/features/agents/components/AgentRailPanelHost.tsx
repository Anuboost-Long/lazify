import clsx from "clsx";
import type { ReactNode } from "react";

import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";

interface AgentRailPanelHostProps {
  asModal: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function AgentRailPanelHost({
  asModal,
  onClose,
  children,
}: Readonly<AgentRailPanelHostProps>) {
  if (!asModal) return <>{children}</>;

  return (
    <BaseModal open onClose={onClose}>
      <div
        className={clsx(
          "flex h-[70vh] max-h-[calc(100vh-4rem)] w-[26rem] max-w-[calc(100vw-2rem)]",
          "overflow-hidden rounded-shell border border-border bg-soft shadow-panel"
        )}
      >
        {children}
      </div>
    </BaseModal>
  );
}
