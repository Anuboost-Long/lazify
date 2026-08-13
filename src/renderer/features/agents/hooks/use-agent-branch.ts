import { useCallback, useEffect, useState } from "react";

import type { ProjectGitStatusResult } from "@renderer/shared/types/lazify";

export function useAgentBranch(projectPath: string) {
  const [status, setStatus] = useState<ProjectGitStatusResult | null>(null);

  const [loading, setLoading] = useState(false);

  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!projectPath) {
      setStatus(null);
      return;
    }

    let cancelled = false;

    setLoading(true);

    void globalThis.lazify
      .getProjectGitStatus(projectPath)
      .then((result) => {
        if (!cancelled) setStatus(result);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectPath, nonce]);

  return {
    status,
    loading,
    refresh: useCallback(() => setNonce((current) => current + 1), []),
  };
}
