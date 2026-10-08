import { useCallback, useRef, useState } from "react";

const COLS = 100;
const ROWS = 28;

export function useDocAgent(projectPath: string) {
  const [runId, setRunId] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const starting = useRef(false);

  const stop = useCallback(() => {
    if (runId) void globalThis.lazify.stopScript(runId).catch(() => undefined);

    starting.current = false;
    setRunId(null);
    setPending(null);
    setPicking(false);
  }, [runId]);

  return {
    runId,
    pending,
    picking,
    ask: (prompt: string) => {
      setPending(prompt);

      if (!runId) setPicking(true);
    },
    start: async (agentId: string, resumeSessionId?: string) => {
      starting.current = true;
      setPicking(false);

      try {
        const started = await globalThis.lazify.openAgentTerminal(
          agentId,
          projectPath,
          COLS,
          ROWS,
          resumeSessionId,
          true
        );

        setRunId(started.runId);
      } catch {
        setPending(null);
      } finally {
        starting.current = false;
      }
    },
    sent: () => setPending(null),
    /** The picker closes itself on choosing one, so a start in flight keeps its prompt. */
    cancelPicking: () => {
      setPicking(false);

      if (!starting.current) setPending(null);
    },
    stop
  };
}

export type DocAgentApi = ReturnType<typeof useDocAgent>;
