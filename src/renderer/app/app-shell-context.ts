import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";
import { useOutletContext } from "react-router-dom";

export type AppShellContextValue = ReturnType<typeof useLazifyStore>;

export function useAppShellContext() {
  return useOutletContext<AppShellContextValue>();
}
