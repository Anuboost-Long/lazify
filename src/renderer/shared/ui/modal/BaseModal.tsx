import clsx from "clsx";
import { translation } from "@renderer/i18n/translation";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

interface BaseModalProps {
  open: boolean;
  children: ReactNode;
  cancellable?: boolean;
  onClose?: () => void;
  contentClassName?: string;
  overlayClassName?: string;
  itemAlignment?: "flex-start" | "center" | "flex-end";
  justifyAlignment?: "flex-start" | "center" | "flex-end";
}

export function BaseModal({
  open,
  children,
  cancellable = true,
  onClose,
  contentClassName,
  overlayClassName,
  itemAlignment = "center",
  justifyAlignment = "center"
}: BaseModalProps) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = open ? "hidden" : previousOverflow || "auto";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mounted, open]);

  useEffect(() => {
    if (!open || !onClose || !cancellable) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);

    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown);
    };
  }, [cancellable, onClose, open]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className={clsx(
        "fixed inset-0 z-50",
        open ? "pointer-events-auto" : "pointer-events-none",
        overlayClassName
      )}
    >
      {cancellable ? (
        <button
          type="button"
          aria-label={t(translation.GlobalTerm.CloseModal)}
          onClick={onClose}
          className={clsx(
            "absolute inset-0 h-full w-full bg-[#04111a]/68 backdrop-blur-[2px] transition-opacity duration-300 ease-out",
            open ? "opacity-100" : "opacity-0"
          )}
        />
      ) : (
        <div
          className={clsx(
            "absolute inset-0 bg-[#04111a]/68 backdrop-blur-[2px] transition-opacity duration-300 ease-out",
            open ? "opacity-100" : "opacity-0"
          )}
        />
      )}

      <div
        className={clsx("relative flex h-full w-full", contentClassName)}
        style={{ alignItems: itemAlignment, justifyContent: justifyAlignment }}
      >
        <div
          className={clsx(
            "transition-[opacity,transform] duration-300 ease-out",
            open
              ? "translate-y-0 opacity-100 delay-150"
              : "translate-y-3 opacity-0 delay-0"
          )}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
