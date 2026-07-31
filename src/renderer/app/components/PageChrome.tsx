import { createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Lets a page put content into the shell's top bar.
 *
 * The bar used to be a static label over a description that never changed, so
 * it cost 56px and told you nothing the sidebar wasn't already showing. Pages
 * push their own breadcrumb tail and action buttons into it instead, which
 * means they no longer need a title row of their own.
 *
 * Portals are used rather than context state so a page can render whatever it
 * likes without the shell re-rendering on every keystroke.
 */

interface PageChromeSlots {
  crumb: HTMLElement | null;
  actions: HTMLElement | null;
}

export const PageChromeContext = createContext<PageChromeSlots>({
  crumb: null,
  actions: null
});

/** Appends to the breadcrumb, after the active page's own name. */
export function PageCrumb({ children }: Readonly<{ children: ReactNode }>) {
  const { crumb } = useContext(PageChromeContext);

  return crumb ? createPortal(children, crumb) : null;
}

/** Renders page-level actions at the right end of the top bar. */
export function PageActions({ children }: Readonly<{ children: ReactNode }>) {
  const { actions } = useContext(PageChromeContext);

  return actions ? createPortal(children, actions) : null;
}
