/**
 * Spots the moment an agent stops working and starts waiting on the user.
 *
 * Reading the output is `detectTerminalIntent`'s job; this owns what a session
 * has been through. It keeps the rolling tail each reading is taken from, holds
 * the turn state that decides whether a finished-looking screen is worth an
 * alert, and reports transitions — callers want the moment a run started
 * waiting, not the fact that it still is on every redraw.
 */

import { detectTerminalIntent, stripAnsi } from "./terminal-intent";

/** Enough tail to hold a full prompt box, small enough to scan on every chunk. */
const TAIL_LIMIT = 4000;

/**
 * Silence that means a working agent has finished its turn.
 *
 * Agents animate a status line for as long as they are working, so their output
 * never goes quiet mid-task. A gap this long after a working spell — with no
 * prompt on screen — is the agent having handed the work back.
 */
const IDLE_SETTLE_MS = 3000;

interface SessionState {
  tail: string;
  waiting: boolean;
  /** True once the agent has been seen working, until its turn is reported. */
  busy: boolean;
  /** Pending "the output has gone quiet" check for the current turn. */
  idleTimer: NodeJS.Timeout | null;
}

export class AttentionDetector {
  private readonly sessions = new Map<string, SessionState>();

  /**
   * @param onTurnDone Called once per turn, when an agent that was working goes
   * quiet without a prompt on screen — it finished what it was asked for.
   */
  constructor(private readonly onTurnDone?: (runId: string) => void) {}

  /** Registers a session to watch. Only agent runs should be tracked. */
  track(runId: string): void {
    this.sessions.set(runId, { tail: "", waiting: false, busy: false, idleTimer: null });
  }

  forget(runId: string): void {
    const session = this.sessions.get(runId);
    if (session?.idleTimer) clearTimeout(session.idleTimer);

    this.sessions.delete(runId);
  }

  isTracked(runId: string): boolean {
    return this.sessions.has(runId);
  }

  /** True when this run is currently believed to be waiting on the user. */
  isWaiting(runId: string): boolean {
    return this.sessions.get(runId)?.waiting ?? false;
  }

  /**
   * The rolling tail this run's readings are taken from — what is on screen now.
   *
   * Exposed for autopilot, which has to re-read the prompt at the moment it
   * types rather than trusting the chunk that announced it.
   */
  screen(runId: string): string | null {
    return this.sessions.get(runId)?.tail ?? null;
  }

  /**
   * Feeds a chunk of output. Returns the new waiting state when it changed,
   * or null when nothing changed — callers only notify on a transition.
   */
  push(runId: string, chunk: string): boolean | null {
    const session = this.sessions.get(runId);
    if (!session) {
      // Set LAZIFY_DEBUG_ATTENTION=1 to trace detection. An untracked run means
      // the session was never registered (e.g. restored after a refresh).
      if (process.env.LAZIFY_DEBUG_ATTENTION) {
        console.log(`[attention] push on UNTRACKED run ${runId}`);
      }
      return null;
    }

    const visible = stripAnsi(chunk);

    session.tail = (session.tail + visible).slice(-TAIL_LIMIT);

    // What the window as a whole currently says. The rolling tail is what the
    // user is looking at, so it — not the chunk — decides whether the run is
    // waiting: agents redraw a prompt in fragments, and a fragment on its own
    // says nothing.
    const screen = detectTerminalIntent(session.tail);
    const prompting = screen.intent === "question";

    // Set LAZIFY_DEBUG_ATTENTION=1 to trace how a screen was read. Logs on a
    // decisive reading or a state flip, so ordinary redraw noise stays out.
    if (
      process.env.LAZIFY_DEBUG_ATTENTION &&
      (screen.intent !== "unknown" || prompting !== session.waiting)
    ) {
      console.log(
        `[attention] ${runId} intent=${screen.intent} ` +
          `confidence=${screen.confidence.toFixed(2)} reasons=${screen.reasons.join(",")} ` +
          `was=${session.waiting} tail=${JSON.stringify(session.tail.slice(-200))}`,
      );
    }

    // Turn state is armed from the *incoming* chunk, never the tail. The tail
    // keeps a working status line long after the work stopped, so arming from
    // it re-armed the turn on any idle redraw — the agent sat there finished
    // while a fresh "done" alert fired every few seconds. Re-arming takes the
    // agent actually printing that it is working again.
    const incoming = detectTerminalIntent(visible);

    if (incoming.intent === "working") session.busy = true;

    // The agent drawing its idle input box is the end of a turn stated outright,
    // which beats inferring it from silence: it fires the moment the work lands
    // rather than three seconds later, and it cannot be faked by a slow tool.
    // Silence stays armed underneath for agents whose footer says nothing.
    if (session.busy && !prompting && incoming.intent === "complete") {
      this.reportTurnDone(runId, session);
    } else if (session.busy) {
      this.scheduleIdleCheck(runId, session);
    }

    if (prompting === session.waiting) return null;

    session.waiting = prompting;

    // Deliberately NOT clearing the tail here. Agents redraw their prompt in
    // partial chunks (a focus-out escape alone triggers one), and a cleared
    // tail would read the next partial redraw as "no prompt" and flip waiting
    // straight back off. Leaving the prompt in the rolling window keeps it
    // detected; a real answer (clear()) or a later "resumed" line turns it off.
    return prompting;
  }

  /** (Re)starts the quiet-output check that reports the end of a turn. */
  private scheduleIdleCheck(runId: string, session: SessionState): void {
    if (session.idleTimer) clearTimeout(session.idleTimer);

    session.idleTimer = setTimeout(() => {
      session.idleTimer = null;

      // A prompt on screen is the agent asking rather than finishing — that is
      // the bell's job, and output resuming re-arms this check for the real end.
      if (!session.busy || session.waiting) return;

      this.reportTurnDone(runId, session);
    }, IDLE_SETTLE_MS);
  }

  /** Reports the turn once and closes it, whichever signal got there first. */
  private reportTurnDone(runId: string, session: SessionState): void {
    if (session.idleTimer) {
      clearTimeout(session.idleTimer);
      session.idleTimer = null;
    }

    session.busy = false;
    // The turn is over, so the working status line in the window is history.
    // Dropping it keeps stale text out of the next turn's decisions.
    session.tail = "";
    this.onTurnDone?.(runId);
  }

  /**
   * Clears the waiting flag because the user answered — typing into the PTY is
   * the answer, so main calls this from the write path rather than waiting for
   * the agent to print something that happens to match a resumed pattern.
   */
  clear(runId: string): boolean {
    const session = this.sessions.get(runId);
    if (!session?.waiting) return false;

    session.waiting = false;
    session.tail = "";

    return true;
  }
}
