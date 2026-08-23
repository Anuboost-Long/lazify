import { useSyncExternalStore } from "react";

export interface FailureNotice {
  id: number;
  titleKey: string;
  messageKey: string;
}

let current: FailureNotice | null = null;
let lastId = 0;

const listeners = new Set<() => void>();

function publish(): void {
  for (const listener of listeners) listener();
}

export function reportFailure(titleKey: string, messageKey: string): void {
  if (current?.titleKey === titleKey && current.messageKey === messageKey) return;

  lastId += 1;
  current = { id: lastId, titleKey, messageKey };
  publish();
}

export function dismissFailure(): void {
  if (!current) return;

  current = null;
  publish();
}

export function failureNotice(): FailureNotice | null {
  return current;
}

export function subscribeFailure(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function useFailureNotice(): FailureNotice | null {
  return useSyncExternalStore(subscribeFailure, failureNotice, () => null);
}
