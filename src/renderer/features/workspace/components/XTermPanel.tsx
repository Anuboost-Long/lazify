import "@xterm/xterm/css/xterm.css";

import { useTerminalMount } from "@renderer/shared/terminal";

interface XTermPanelProps {
  runId: string;
  isActive?: boolean;
  /** Grab keyboard focus when this terminal is the visible one. */
  autoFocus?: boolean;
  /**
   * Build a private terminal instead of sharing the run's one. Costs a second
   * parse of the same output, and is only needed to show one run in two places
   * at once.
   */
  privateInstance?: boolean;
  /**
   * Turns a path printed in the output into an absolute file path, or null when
   * it points at nothing. Only what resolves is drawn as a link, so prose that
   * happens to look path-shaped stays plain text. Absent → no links at all.
   */
  onResolveFilePath?: (printedPath: string) => Promise<string | null>;
  /** Opens a clicked file link, at the line the output named when it named one. */
  onOpenFilePath?: (absolutePath: string, line: number | null) => void;
}

export function XTermPanel({
  runId,
  isActive,
  autoFocus,
  privateInstance,
  onResolveFilePath,
  onOpenFilePath,
}: Readonly<XTermPanelProps>) {
  const containerRef = useTerminalMount({
    runId,
    shared: !privateInstance,
    active: isActive,
    autoFocus,
    onResolveFilePath,
    onOpenFilePath,
  });

  return <div ref={containerRef} className="h-full w-full" style={{ minHeight: 0 }} />;
}
