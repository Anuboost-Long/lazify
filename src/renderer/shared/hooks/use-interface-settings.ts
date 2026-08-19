import { atom, useAtom } from "jotai";

const COMPACT_SIDEBAR_KEY = "lazify-compact-sidebar";
const REDUCE_MOTION_KEY = "lazify-reduce-motion";
const SHOW_TOOLTIPS_KEY = "lazify-show-tooltips";
const OPEN_AGENT_AFTER_SEND_KEY = "lazify-open-agent-after-send";
const REMEMBER_ROUTE_KEY = "lazify-remember-route";

function readBool(key: string, defaultValue: boolean): boolean {
  if (typeof window === "undefined") return defaultValue;
  const stored = globalThis.localStorage.getItem(key);
  return stored === null ? defaultValue : stored === "true";
}

const compactSidebarAtom = atom(readBool(COMPACT_SIDEBAR_KEY, false));
const reduceMotionAtom   = atom(readBool(REDUCE_MOTION_KEY, false));
const showTooltipsAtom   = atom(readBool(SHOW_TOOLTIPS_KEY, true));
const openAgentAfterSendAtom = atom(readBool(OPEN_AGENT_AFTER_SEND_KEY, true));
const rememberRouteAtom  = atom(readBool(REMEMBER_ROUTE_KEY, true));

export function useInterfaceSettings() {
  const [compactSidebar, setCompactSidebarAtom] = useAtom(compactSidebarAtom);
  const [reduceMotion,   setReduceMotionAtom]   = useAtom(reduceMotionAtom);
  const [showTooltips,   setShowTooltipsAtom]   = useAtom(showTooltipsAtom);
  const [openAgentAfterSend, setOpenAgentAfterSendAtom] = useAtom(
    openAgentAfterSendAtom
  );
  const [rememberRoute,  setRememberRouteAtom]  = useAtom(rememberRouteAtom);

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
  function setOpenAgentAfterSend(value: boolean) {
    globalThis.localStorage.setItem(OPEN_AGENT_AFTER_SEND_KEY, String(value));
    setOpenAgentAfterSendAtom(value);
  }
  function setRememberRoute(value: boolean) {
    globalThis.localStorage.setItem(REMEMBER_ROUTE_KEY, String(value));
    setRememberRouteAtom(value);
  }

  return {
    compactSidebar, setCompactSidebar,
    reduceMotion,   setReduceMotion,
    showTooltips,   setShowTooltips,
    openAgentAfterSend, setOpenAgentAfterSend,
    rememberRoute,  setRememberRoute,
  };
}
