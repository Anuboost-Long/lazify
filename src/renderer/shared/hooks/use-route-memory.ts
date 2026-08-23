import { atom, useAtom } from "jotai";
import { useCallback } from "react";

import { appRoute } from "@renderer/app/app-routes";
import type { AppPageId } from "@renderer/app/app-sidebar.constant";

/**
 * Where the user was inside a page, so returning to it does not start over.
 *
 * Only the address is kept — one string per page — because the panes behind it
 * already restore themselves from their own storage: the workbench reopens its
 * editor tabs from the project path in the address. Holding mounted routes
 * would remember the same thing at a far higher price in memory.
 */

const STORAGE_KEY = "lazify-route-memory";

/** Pages with sub-routes worth returning to, and the address they branch from. */
const REMEMBERED_PAGES: Array<{ id: AppPageId; root: string }> = [
  { id: "workspace", root: appRoute.workspace },
  { id: "tools", root: appRoute.tools }
];

type RouteMemory = Partial<Record<AppPageId, string>>;

function readStored(): RouteMemory {
  if (typeof window === "undefined") return {};

  try {
    const stored = JSON.parse(globalThis.localStorage.getItem(STORAGE_KEY) ?? "{}") as RouteMemory;

    return stored && typeof stored === "object" ? stored : {};
  } catch {
    return {};
  }
}

const routeMemoryAtom = atom(readStored());

export function pageOfSubRoute(pathname: string): AppPageId | null {
  return REMEMBERED_PAGES.find((page) => pathname.startsWith(`${page.root}/`))?.id ?? null;
}

export function pageOfRoot(pathname: string): AppPageId | null {
  return REMEMBERED_PAGES.find((page) => page.root === pathname)?.id ?? null;
}

export function useRouteMemory() {
  const [memory, setMemory] = useAtom(routeMemoryAtom);

  const remember = useCallback(
    (pathname: string) => {
      const pageId = pageOfSubRoute(pathname);

      if (!pageId || memory[pageId] === pathname) return;

      const next = { ...memory, [pageId]: pathname };

      globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setMemory(next);
    },
    [memory, setMemory]
  );

  /**
   * Where a page link should lead: back to the sub-route last seen there.
   *
   * The breadcrumb still navigates to the page's own root, so the list stays
   * one click away without this having to hand it back.
   */
  const recall = useCallback(
    (targetPath: string) => {
      const pageId = pageOfRoot(targetPath);

      return (pageId && memory[pageId]) || targetPath;
    },
    [memory]
  );

  return { remember, recall };
}
