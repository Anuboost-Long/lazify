import { useEffect, useState } from "react";

/**
 * Works out which localhost address the project's running script is serving.
 *
 * The port is discovered the same way the debug panel finds it — by scanning
 * the run's process tree — so it appears a moment after the server binds rather
 * than the instant the run starts. Only the detected address is reported here;
 * whether the preview follows it is the panel's decision, because the user may
 * have typed somewhere else in the meantime.
 */

/** How often the process tree is re-scanned while a run is live. */
const POLL_MS = 2000;

/**
 * Dev servers commonly bind a second port for HMR or DevTools. The lowest one
 * is the page in every stack we launch, so ties break downwards.
 */
function pickPort(ports: Array<{ port: number }>): number | null {
  if (ports.length === 0) return null;
  return ports.reduce((lowest, entry) => (entry.port < lowest ? entry.port : lowest), ports[0].port);
}

/**
 * The URL a live run is serving, or null when nothing is running or the server
 * has not bound a port yet.
 */
export function usePreviewUrl(runId: string | null, isRunning: boolean): string | null {
  const [detectedUrl, setDetectedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!runId || !isRunning) {
      setDetectedUrl(null);
      return;
    }

    let cancelled = false;

    const read = async () => {
      const sessions = await globalThis.lazify.listSessions();
      if (cancelled) return;

      const port = pickPort(sessions.find((entry) => entry.runId === runId)?.ports ?? []);
      // `localhost` rather than the bound address: a server on 0.0.0.0 or ::1
      // is reachable there too, and it is what the tool's own banner prints.
      setDetectedUrl(port === null ? null : `http://localhost:${port}`);
    };

    void read();
    const timer = setInterval(() => void read(), POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [runId, isRunning]);

  return detectedUrl;
}
