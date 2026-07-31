import { atom, useAtom } from "jotai";

const COMPACT_SIDEBAR_KEY = "lazify-compact-sidebar";
const REDUCE_MOTION_KEY = "lazify-reduce-motion";
const SHOW_TOOLTIPS_KEY = "lazify-show-tooltips";

function readBool(key: string, defaultValue: boolean): boolean {
  if (typeof window === "undefined") return defaultValue;
  const stored = globalThis.localStorage.getItem(key);
  return stored === null ? defaultValue : stored === "true";
}

const compactSidebarAtom = atom(readBool(COMPACT_SIDEBAR_KEY, false));
const reduceMotionAtom   = atom(readBool(REDUCE_MOTION_KEY, false));
const showTooltipsAtom   = atom(readBool(SHOW_TOOLTIPS_KEY, true));

export function useInterfaceSettings() {
  const [compactSidebar, setCompactSidebarAtom] = useAtom(compactSidebarAtom);
  const [reduceMotion,   setReduceMotionAtom]   = useAtom(reduceMotionAtom);
  const [showTooltips,   setShowTooltipsAtom]   = useAtom(showTooltipsAtom);

  function setCompactSidebar(value: boolean) {
    globalThis.localStorage.setItem(COMPACT_SIDEBAR_KEY, String(value));
    setCompactSidebarAtom(value);
  }
  function setReduceMotion(value: boolean) {
    globalThis.localStorage.setItem(REDUCE_MOTION_KEY, String(value));
    setReduceMotionAtom(value);
  }
  function setShowTooltips(value: boolean) {
    globalThis.localStorage.setItem(SHOW_TOOLTIPS_KEY, String(value));
    setShowTooltipsAtom(value);
  }

  return {
    compactSidebar, setCompactSidebar,
    reduceMotion,   setReduceMotion,
    showTooltips,   setShowTooltips,
  };
}
