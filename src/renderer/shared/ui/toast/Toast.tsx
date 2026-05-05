import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { translation } from "@renderer/i18n/translation";
import { BodyText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { useTranslation } from "react-i18next";

const DISMISS_AFTER_MS = 4500;

type ToastVariant = "success" | "warning";

const variantStyles: Record<ToastVariant, { border: string; icon: string; bar: string; iconBg: string }> = {
  success: {
    border: "border-success/30",
    icon: "text-success",
    iconBg: "bg-success/10",
    bar: "bg-success",
  },
  warning: {
    border: "border-warning/30",
    icon: "text-warning",
    iconBg: "bg-warning/10",
    bar: "bg-warning",
  },
};

interface ToastProps {
  title: string;
  message: string;
  variant?: ToastVariant;
  onClose: () => void;
}

export function Toast({ title, message, variant = "warning", onClose }: ToastProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  useEffect(() => {
    const enterFrame = requestAnimationFrame(() => setVisible(true));
    timerRef.current = setTimeout(dismiss, DISMISS_AFTER_MS);

    return () => {
      cancelAnimationFrame(enterFrame);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const styles = variantStyles[variant];

  return createPortal(
    <div
      role="alert"
      aria-live="assertive"
      className={[
        "fixed right-5 top-5 z-[100] w-[340px] overflow-hidden rounded-[20px] border bg-soft shadow-panel",
        styles.border,
        "transition-[opacity,transform] duration-300 ease-out",
        visible ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0",
      ].join(" ")}
    >
      <div className="flex items-start gap-3 px-4 py-4">
        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${styles.iconBg} ${styles.icon}`}>
          <UiIcon
            name={variant === "success" ? "check-circle" : "warning-triangle"}
            className="h-4 w-4"
          />
        </span>

        <div className="min-w-0 flex-1">
          <BodyText className="font-semibold">{title}</BodyText>
          <BodyText tone="muted" className="mt-0.5 leading-5">{message}</BodyText>
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label={t(translation.GlobalTerm.Dismiss)}
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-border hover:text-text"
        >
          <UiIcon name="xmark" className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="h-[3px] w-full bg-border">
        <div
          className={`h-full origin-left ${styles.bar}`}
          style={{ animation: `toast-drain ${DISMISS_AFTER_MS}ms linear forwards` }}
        />
      </div>
    </div>,
    document.body
  );
}
