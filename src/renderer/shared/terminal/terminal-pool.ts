import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";

import { registerTerminalPaste } from "@renderer/shared/lib/terminal-paste";
import { attachClipboardPaste } from "./clipboard-paste";
import { registerFileLinks, type FileLinkHandlers } from "./file-link-provider";
import { terminalTheme } from "./terminal-theme";

/**
 * How many terminals with no mount point are kept alive before the oldest is
 * disposed. A detached terminal is what lets a run keep its scrollback across a
 * route change; without a cap they would accumulate for the life of the app.
 */
const MAX_DETACHED = 8;

export interface PooledTerminal {
  runId: string;
  shared: boolean;
  links: FileLinkHandlers;
}

interface Entry extends PooledTerminal {
  term: Terminal | null;
  fit: FitAddon | null;
  holder: HTMLDivElement;
  mounts: HTMLElement[];
  replayed: boolean;
  pending: { data: string; seq?: number }[];
  detachedAt: number;
  openObserver: ResizeObserver | null;
  sizeObserver: ResizeObserver | null;
  firstFit: number | null;
  disposers: (() => void)[];
}

const entriesByRun = new Map<string, Entry[]>();

let stopPtyData: (() => void) | null = null;
let stopSessionKilled: (() => void) | null = null;
let currentTheme = "dark";

function allEntries() {
  return [...entriesByRun.values()].flat();
}

function ensureListeners() {
  if (stopPtyData) return;

  stopPtyData = globalThis.lazify.onPtyData((event) => {
    const entries = entriesByRun.get(event.runId);
    if (!entries) return;

    entries.forEach((entry) => {
      if (entry.term && entry.replayed) {
        entry.term.write(event.data);
        return;
      }

      entry.pending.push({ data: event.data, seq: event.seq });
    });
  });

  stopSessionKilled = globalThis.lazify.onSessionKilled((event) => {
    disposeRun(event.runId);
  });
}

function owner(entry: Entry) {
  return entry.mounts.at(-1) ?? null;
}

function fitToOwner(entry: Entry) {
  const { term, fit } = entry;
  if (!term || !fit) return;
  if (entry.holder.offsetWidth === 0 || entry.holder.offsetHeight === 0) return;

  try {
    fit.fit();
    globalThis.lazify.ptyResize(entry.runId, term.cols, term.rows);
  } catch {
    // the holder may have been detached between observation and callback
  }
}

/**
 * Replay what the session already printed, so a terminal built after the run
 * started shows the transcript. Live chunks are held aside from the moment the
 * pool starts listening, then flushed after the backlog and matched by
 * sequence, so nothing is lost or duplicated in the round-trip.
 *
 * Deliberately after the first fit: the backlog was produced at the session's
 * own width, and replaying it into an unmeasured 80-column buffer would rewrap
 * every line.
 */
function replayBacklog(entry: Entry) {
  const term = entry.term;
  if (!term) return;

  void globalThis.lazify
    .ptyBacklog(entry.runId)
    .then(({ data, seq }) => {
      if (data) term.write(data);

      entry.pending
        .filter((chunk) => chunk.seq === undefined || chunk.seq > seq)
        .forEach((chunk) => term.write(chunk.data));
    })
    .catch(() => {
      entry.pending.forEach((chunk) => term.write(chunk.data));
    })
    .finally(() => {
      entry.pending = [];
      entry.replayed = true;
    });
}

/**
 * xterm measures its character cell against the live DOM when it opens, and an
 * element inside a closed panel measures zero — leaving a terminal whose cell
 * size is 0 and which therefore paints nothing, however often it is fitted
 * afterwards. So the terminal is not built at all until the holder reports a
 * real box to measure against.
 */
function buildWhenMeasurable(entry: Entry) {
  if (entry.term || !owner(entry)) return;

  if (entry.holder.offsetWidth > 0 && entry.holder.offsetHeight > 0) {
    buildTerminal(entry);
    return;
  }

  if (entry.openObserver) return;

  entry.openObserver = new ResizeObserver(() => {
    if (entry.holder.offsetWidth === 0 || entry.holder.offsetHeight === 0) return;

    entry.openObserver?.disconnect();
    entry.openObserver = null;
    buildTerminal(entry);
  });

  entry.openObserver.observe(entry.holder);
}

function buildTerminal(entry: Entry) {
  if (entry.term) return;

  const term = new Terminal({
    cursorBlink: true,
    fontFamily: '"JetBrains Mono", "Fira Code", Menlo, Consolas, monospace',
    fontSize: 12.5,
    // Block-drawing output (Expo QR codes, progress bars, box UIs) relies on
    // glyphs touching edge to edge, so rows and columns get no extra gap.
    lineHeight: 1,
    letterSpacing: 0,
    theme: terminalTheme(currentTheme),
    scrollback: 10_000,
    allowTransparency: false,
    convertEol: false,
  });

  const fit = new FitAddon();
  term.loadAddon(fit);
  term.open(entry.holder);

  entry.term = term;
  entry.fit = fit;

  term.onData((data) => globalThis.lazify.ptyWrite(entry.runId, data));
  entry.disposers.push(registerFileLinks(term, entry.links));
  entry.disposers.push(attachClipboardPaste(entry.holder, term));

  // The app-level paste bridge addresses one run, so only the shared terminal
  // claims it — a private instance would silently take over the delivery.
  if (entry.shared) {
    entry.disposers.push(
      registerTerminalPaste(entry.runId, (text) => term.paste(text)),
    );
  }

  entry.sizeObserver = new ResizeObserver(() => fitToOwner(entry));
  entry.sizeObserver.observe(entry.holder);

  entry.firstFit = requestAnimationFrame(() => {
    entry.firstFit = null;
    fitToOwner(entry);
    replayBacklog(entry);
  });
}

function createEntry(runId: string, shared: boolean): Entry {
  ensureListeners();

  const holder = document.createElement("div");
  holder.className = "h-full w-full";
  holder.style.minHeight = "0";

  return {
    runId,
    shared,
    links: {},
    term: null,
    fit: null,
    holder,
    mounts: [],
    replayed: false,
    pending: [],
    detachedAt: 0,
    openObserver: null,
    sizeObserver: null,
    firstFit: null,
    disposers: [],
  };
}

function disposeEntry(entry: Entry) {
  if (entry.firstFit !== null) cancelAnimationFrame(entry.firstFit);

  entry.firstFit = null;
  entry.openObserver?.disconnect();
  entry.sizeObserver?.disconnect();
  entry.disposers.forEach((dispose) => dispose());
  entry.term?.dispose();
  entry.term = null;
  entry.fit = null;
  entry.holder.remove();

  const remaining = (entriesByRun.get(entry.runId) ?? []).filter(
    (candidate) => candidate !== entry,
  );

  if (remaining.length === 0) entriesByRun.delete(entry.runId);
  else entriesByRun.set(entry.runId, remaining);
}

function evictDetached() {
  const detached = allEntries()
    .filter((entry) => entry.mounts.length === 0)
    .sort((left, right) => left.detachedAt - right.detachedAt);

  detached.slice(0, Math.max(0, detached.length - MAX_DETACHED)).forEach(disposeEntry);
}

export function disposeRun(runId: string) {
  (entriesByRun.get(runId) ?? []).slice().forEach(disposeEntry);
}

export function acquire(runId: string, shared = true): PooledTerminal {
  const existing = entriesByRun.get(runId) ?? [];

  if (shared) {
    const reusable = existing.find((entry) => entry.shared);
    if (reusable) return reusable;
  }

  const entry = createEntry(runId, shared);
  entriesByRun.set(runId, [...existing, entry]);

  return entry;
}

export function attach(pooled: PooledTerminal, container: HTMLElement) {
  const entry = pooled as Entry;

  if (!entry.mounts.includes(container)) entry.mounts.push(container);

  const target = owner(entry);
  if (target && entry.holder.parentElement !== target) target.appendChild(entry.holder);

  buildWhenMeasurable(entry);
  fitToOwner(entry);
}

export function detach(pooled: PooledTerminal, container: HTMLElement) {
  const entry = pooled as Entry;

  entry.mounts = entry.mounts.filter((mount) => mount !== container);

  const target = owner(entry);

  // Handed back rather than dropped: the workspace tab stays mounted behind the
  // monitor wall, so when the wall lets go the tab is still there to show it.
  if (target) {
    target.appendChild(entry.holder);
    buildWhenMeasurable(entry);
    fitToOwner(entry);
    return;
  }

  entry.holder.remove();
  entry.detachedAt = Date.now();
  evictDetached();
}

export function focusTerminal(pooled: PooledTerminal) {
  (pooled as Entry).term?.focus();
}

export function setTerminalTheme(resolvedTheme: string) {
  currentTheme = resolvedTheme;

  allEntries().forEach((entry) => {
    if (!entry.term) return;

    entry.term.options.theme = terminalTheme(resolvedTheme);
  });
}

export function stopTerminalPool() {
  allEntries().forEach(disposeEntry);
  stopPtyData?.();
  stopSessionKilled?.();
  stopPtyData = null;
  stopSessionKilled = null;
}
