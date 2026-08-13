type Paster = (text: string) => void;

const pasters = new Map<string, Paster>();
const pending = new Map<string, string[]>();

export function registerTerminalPaste(runId: string, paste: Paster): () => void {
  pasters.set(runId, paste);

  const queued = pending.get(runId);
  if (queued) {
    pending.delete(runId);
    for (const text of queued) paste(text);
  }

  return () => {
    if (pasters.get(runId) === paste) pasters.delete(runId);
  };
}

export function pasteIntoTerminal(runId: string, text: string) {
  const paste = pasters.get(runId);

  if (paste) {
    paste(text);
    return;
  }

  pending.set(runId, [...(pending.get(runId) ?? []), text]);
}

export function resetTerminalPaste() {
  pasters.clear();
  pending.clear();
}
