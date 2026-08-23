import { createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";

interface PageChromeSlots {
  crumb: HTMLElement | null;
  actions: HTMLElement | null;
}

export const PageChromeContext = createContext<PageChromeSlots>({
  crumb: null,
  actions: null
});

interface PageCrumbProps {
  children: ReactNode;
  onBack?: () => void;
}

export function PageCrumb({ children, onBack }: Readonly<PageCrumbProps>) {
  const { t } = useTranslation();
  const { actions, crumb } = useContext(PageChromeContext);

  return (
    <>
      {crumb ? createPortal(children, crumb) : null}
      {actions && onBack
        ? createPortal(
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-soft px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:border-accent hover:text-accent"
            >
              {t(translation.GlobalTerm.Back)}
            </button>,
            actions,
          )
        : null}
    </>
  );
}

export function PageActions({ children }: Readonly<{ children: ReactNode }>) {
  const { actions } = useContext(PageChromeContext);

  return actions ? createPortal(children, actions) : null;
}
