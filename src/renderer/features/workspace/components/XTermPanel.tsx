import "@xterm/xterm/css/xterm.css";

import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useEffect, useLayoutEffect, useRef } from "react";

interface XTermPanelProps {
  runId: string;
  isActive?: boolean;
  /** Grab keyboard focus when this terminal is the visible one. */
  autoFocus?: boolean;
  onReady?: (cols: number, rows: number) => void;
}

// Match the existing dark panel background exactly.
// The terminal is always dark, in both app themes, so default text stays pure
// white; the ANSI colours below are left alone so CLI output keeps its colour.
const THEME = {
  background: "#0a0e17",
  foreground: "#ffffff",
  black: "#1a1e2e",
  red: "#f07178",
  green: "#c3e88d",
  yellow: "#ffcb6b",
  blue: "#82aaff",
  magenta: "#c792ea",
  cyan: "#89ddff",
  white: "#ffffff",
  brightBlack: "#4a5068",
  brightRed: "#f07178",
  brightGreen: "#c3e88d",
  brightYellow: "#ffcb6b",
  brightBlue: "#82aaff",
  brightMagenta: "#c792ea",
  brightCyan: "#89ddff",
  brightWhite: "#ffffff",
  cursor: "#c792ea",
  cursorAccent: "#0a0e17",
  selectionBackground: "#c792ea40",
};

export function XTermPanel({
  runId,
  isActive,
  autoFocus,
  onReady,
}: Readonly<XTermPanelProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  // Build the terminal once per runId (key handles remount on new run).
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: '"JetBrains Mono", "Fira Code", Menlo, Consolas, monospace',
      fontSize: 12.5,
      // Block-drawing output (Expo QR codes, progress bars, box UIs) relies on
      // glyphs touching edge to edge, so rows and columns get no extra gap.
      lineHeight: 1,
      letterSpacing: 0,
      theme: THEME,
      scrollback: 10_000,
      allowTransparency: false,
      convertEol: false,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(container);

    // Give the browser one frame to lay out the container before fitting.
    requestAnimationFrame(() => {
      fit.fit();
      const { cols, rows } = term;
      onReady?.(cols, rows);
      globalThis.lazify.ptyResize(runId, cols, rows);
    });

    termRef.current = term;
    fitRef.current = fit;

    // Forward keyboard/paste to the PTY.
    term.onData((data) => globalThis.lazify.ptyWrite(runId, data));

    // Replay what the session already printed, so re-attaching (switching
    // project, or leaving and returning to the page) keeps the transcript.
    //
    // Subscribe first and hold live chunks aside, then write the backlog and
    // flush only the chunks it did not already contain — matched by sequence,
    // so nothing is lost or duplicated in the round-trip.
    let replayed = false;
    let pending: { data: string; seq?: number }[] = [];

    const stopData = globalThis.lazify.onPtyData((event) => {
      if (event.runId !== runId) return;

      if (replayed) {
        term.write(event.data);
      } else {
        pending.push({ data: event.data, seq: event.seq });
      }
    });
    unsubRef.current = stopData;

    void globalThis.lazify
      .ptyBacklog(runId)
      .then(({ data, seq }) => {
        if (data) term.write(data);

        pending
          .filter((chunk) => chunk.seq === undefined || chunk.seq > seq)
          .forEach((chunk) => term.write(chunk.data));
      })
      .catch(() => {
        // No backlog available (non-PTY fallback) — just show live output.
        pending.forEach((chunk) => term.write(chunk.data));
      })
      .finally(() => {
        pending = [];
        replayed = true;
      });

    return () => {
      stopData();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
      unsubRef.current = null;
    };
  }, [runId]);

  // Keep the terminal sized to its container at all times.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      const fit = fitRef.current;
      const term = termRef.current;
      if (!fit || !term) return;
      // Skip fitting when the container is hidden (display:none → 0 dimensions)
      if (container.offsetWidth === 0 || container.offsetHeight === 0) return;
      try {
        fit.fit();
        globalThis.lazify.ptyResize(runId, term.cols, term.rows);
      } catch {
        // container may have been detached between observation and callback
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [runId]);

  // Refit when this terminal tab becomes visible after being hidden.
  useEffect(() => {
    if (!isActive) return;
    const container = containerRef.current;
    const fit = fitRef.current;
    const term = termRef.current;
    if (!container || !fit || !term) return;
    if (container.offsetWidth === 0 || container.offsetHeight === 0) return;
    requestAnimationFrame(() => {
      try {
        fit.fit();
        globalThis.lazify.ptyResize(runId, term.cols, term.rows);
        if (autoFocus) {
          term.focus();
        }
      } catch {
        // terminal may have exited
      }
    });
  }, [autoFocus, isActive, runId]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      // xterm.js injects its own canvas/DOM — let it manage child layout.
      style={{ minHeight: 0 }}
    />
  );
}
