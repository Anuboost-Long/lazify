import { useSyncExternalStore } from "react";

import { hasShownOutput, onShownOutput } from "./terminal-pool";

export function useShownOutput(runId: string) {
  return useSyncExternalStore(onShownOutput, () => hasShownOutput(runId));
}
