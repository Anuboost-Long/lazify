import { powerSaveBlocker } from "electron";

/**
 * Keeps the machine from sleeping while any agent is actually working.
 *
 * Agents run unattended for minutes at a stretch — the system dozing off
 * mid-turn would silently stall whatever is running. This holds a single
 * power-save blocker for the whole app, ref-counted by the runs currently
 * busy, so it only lets the system sleep once every one of them is done.
 *
 * Busy runs are tracked even while disabled, so switching it back on mid-run
 * takes hold straight away instead of at the next turn.
 */
export class AwakeGuard {
  private readonly busyRuns = new Set<string>();
  private blockerId: number | null = null;

  constructor(private enabled: boolean) {}

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.sync();
  }

  setBusy(runId: string, busy: boolean): void {
    if (busy) this.busyRuns.add(runId);
    else this.busyRuns.delete(runId);

    this.sync();
  }

  private sync(): void {
    const shouldHold = this.enabled && this.busyRuns.size > 0;

    if (shouldHold && this.blockerId === null) {
      this.blockerId = powerSaveBlocker.start("prevent-display-sleep");
    } else if (!shouldHold && this.blockerId !== null) {
      powerSaveBlocker.stop(this.blockerId);
      this.blockerId = null;
    }
  }
}
