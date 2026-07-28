import { useCallback, useEffect, useState } from "react";

import type { ProjectGitStatusResult } from "@renderer/shared/types/lazify";

/**
 * The branch the open project sits on, and the ones it can be switched to, so
 * the agents page can move the working tree without a trip to the workspace.
 * A project that is not a repo simply reports nothing.
 */
export function useAgentBranch(projectPath: string) {
  const [status, setStatus] = useState<ProjectGitStatusResult | null>(null);
  /** Bumped to re-read git after a checkout has moved the working tree. */
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!projectPath) {
      setStatus(null);
      return;
    }

    let cancelled = false;

    void globalThis.lazify
      .getProjectGitStatus(projectPath)
      .then((result) => {
        if (!cancelled) setStatus(result);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });

    return () => {
      cancelled = true;
    };
  }, [projectPath, nonce]);

  return {
    status,
    refresh: useCallback(() => setNonce((current) => current + 1), []),
  };
}
