import clsx from "clsx";
import { useEffect, useState, type ReactNode } from "react";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";

interface BaseBottomSheetProps {
  open: boolean;
  children: ReactNode;
  onClose: () => void;
  minHeight?: number | string;
  maxHeight?: number | string;
  panelClassName?: string;
  wrapperClassName?: string;
  cancellable?: boolean;
}

const CLOSE_DELAY_MS = 320;
const OPEN_DELAY_MS = 24;

export function BaseBottomSheet({
  open,
  children,
  onClose,
  minHeight,
  maxHeight = "84vh",
  panelClassName,
  wrapperClassName,
  cancellable = true
}: BaseBottomSheetProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setModalVisible(true);
      const timeout = globalThis.setTimeout(() => {
        setContentVisible(true);
      }, OPEN_DELAY_MS);

      return () => {
        globalThis.clearTimeout(timeout);
      };
    }

    if (!modalVisible) {
      return;
    }

    setContentVisible(false);
    const timeout = globalThis.setTimeout(() => {
      setModalVisible(false);
    }, CLOSE_DELAY_MS);

    return () => {
      globalThis.clearTimeout(timeout);
    };
  }, [modalVisible, open]);

  if (!modalVisible) {
    return null;
  }

  return (
    <BaseModal
      open={modalVisible}
      cancellable={cancellable}
      onClose={onClose}
      itemAlignment="flex-end"
      justifyAlignment="center"
      contentClassName="px-4 pb-4 pt-10 sm:px-6"
    >
      <div
        style={{ minHeight, maxHeight }}
        className={clsx(
          "flex w-full max-w-4xl flex-col overflow-hidden transition-[opacity,transform] duration-300 ease-out",
          contentVisible ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0",
          wrapperClassName
        )}
      >
        <div className={clsx("flex min-h-0 w-full flex-1 flex-col overflow-hidden", panelClassName)}>
          {children}
        </div>
      </div>
    </BaseModal>
  );
}
