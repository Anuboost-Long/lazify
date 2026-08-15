import { findTool, TOOLS } from "./tools";
import { extractVersion } from "./tools/probe";
import type { DetectedTool, ToolModule, ToolProbe, ToolScanReport } from "./tools/types";

// ---------------------------------------------------------------------------
// Scan — parallel execution, inflight dedup, short TTL cache
// ---------------------------------------------------------------------------

const SCAN_CACHE_TTL_MS = 30_000;

interface ScanCache {
  report: ToolScanReport;
  ts: number;
}

let scanCache: ScanCache | null = null;
let inflightScan: Promise<ToolScanReport> | null = null;

/** What the renderer sees: the probe's answer plus the actions it unlocks. */
function describe(tool: ToolModule, status: ToolProbe): DetectedTool {
  const install = status.available ? null : tool.install?.() ?? null;

  return {
    name: tool.name,
    displayName: tool.displayName,
    category: tool.category,
    ...status,
    version: extractVersion(status.version),
    installCommand: install?.command ?? null,
    installNote: install?.note ?? null,
    updateCommand: status.available ? tool.update?.() ?? null : null,
    uninstallCommand: status.available ? tool.uninstall?.()?.command ?? null : null
  };
}

async function runFullScan(): Promise<ToolScanReport> {
  const statuses = await Promise.all(TOOLS.map((tool) => tool.probe()));

  const report: ToolScanReport = {
    tools: TOOLS.map((tool, index) => describe(tool, statuses[index]))
  };

  scanCache = { report, ts: Date.now() };
  return report;
}

export async function scanTools(force = false): Promise<ToolScanReport> {
  if (!force && scanCache && Date.now() - scanCache.ts < SCAN_CACHE_TTL_MS) {
    return scanCache.report;
  }

  if (!force && inflightScan) return inflightScan;

  const scan = runFullScan();
  inflightScan = scan;
  scan.finally(() => { if (inflightScan === scan) inflightScan = null; });
  return scan;
}

// ---------------------------------------------------------------------------
// Single-tool probe
// ---------------------------------------------------------------------------

export async function probeSingleTool(name: string): Promise<DetectedTool | null> {
  const tool = findTool(name);
  if (!tool) return null;

  const updated = describe(tool, await tool.probe());

  if (scanCache) {
    scanCache = {
      report: { tools: scanCache.report.tools.map((entry) => (entry.name === name ? updated : entry)) },
      ts: scanCache.ts
    };
  }

  return updated;
}
