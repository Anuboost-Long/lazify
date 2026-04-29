import clsx from "clsx";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

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

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [cancellable, onClose, open]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className={clsx(
        "fixed inset-0 z-50 transition-opacity duration-300",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        overlayClassName
      )}
    >
      {cancellable ? (
        <button
          type="button"
          aria-label="Close modal"
          onClick={onClose}
          className="absolute inset-0 h-full w-full bg-[#04111a]/58 backdrop-blur-[6px]"
        />
      ) : (
        <div className="absolute inset-0 bg-[#04111a]/58 backdrop-blur-[6px]" />
      )}

      <div
        className={clsx("relative flex h-full w-full", contentClassName)}
        style={{ alignItems: itemAlignment, justifyContent: justifyAlignment }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
