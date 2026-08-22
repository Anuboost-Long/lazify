const hidden = new Set<string>();

export function hideRun(runId: string): void {
  hidden.add(runId);
}

export function isHiddenRun(runId: string): boolean {
  return hidden.has(runId);
}

export function forgetHiddenRun(runId: string): void {
  hidden.delete(runId);
}
