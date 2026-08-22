/**
 * Answers the prompts the user would have said yes to anyway.
 *
 * `AttentionDetector` reports the moment a run starts waiting; `parseAgentPrompt`
 * turns that screen into options; `decideAutopilot` says whether one of them may
 * be picked. This owns the part that needs a clock and a memory: waiting for the
 * box to finish drawing, checking the prompt is still there before typing into
 * it, and noticing when it is being asked the same thing over and over.
 *
 * Two promises shape the code:
 *
 *  - **Every considered prompt is resolved exactly once.** It is either answered
 *    or handed back, and handing back is what happens on any error, any
 *    unreadable screen, any timer that finds the world changed. A prompt that
 *    fell into a gap here would be a session sitting silently forever with no
 *    bell — worse than the pressing-yes it was meant to save.
 *  - **The screen is re-read at the moment of typing, never trusted from
 *    before.** The detector's tail deliberately keeps a prompt after it is drawn
 *    (agents redraw in fragments), so the box that triggered this may already be
 *    answered. The keystroke goes to whatever is on screen *now*, so `now` is
 *    what the decision is made from.
 */

import { detectTerminalIntent } from "./terminal-intent";
import { parseAgentPrompt } from "./prompt-parser";
import { decideAutopilot, type AutopilotHold } from "./autopilot-policy";
import { logError } from "../diagnostics/logger";

/**
 * How long to let a prompt settle before reading it.
 *
 * A prompt box arrives over several chunks — frame, question, then the options
 * one row at a time — and reading it half-drawn finds a menu that stops at 2 or
 * a question with nothing under it. Long enough to catch up with the redraw,
 * short enough that an answered prompt still feels instant.
 */
const SETTLE_MS = 700;

/** Window the rate limit is measured over. */
const RATE_WINDOW_MS = 60_000;

/**
 * Most prompts autopilot will answer in a minute for one run.
 *
 * A working agent asks a handful of times a minute at most. Anything past this
 * is a session doing something unusual, and the right response to unusual is a
 * human looking at it.
 */
const MAX_PER_WINDOW = 8;

/** How long an answered prompt is remembered for the repeat check. */
const REPEAT_WINDOW_MS = 120_000;

/**
 * How many times the same question may be answered before it is handed over.
 *
 * Two is on purpose rather than one: an agent legitimately runs the same command
 * twice in a turn. A third identical prompt means the answer is not sticking —
 * a permission that is not being remembered, or a loop — and feeding a loop
 * yeses forever is exactly the failure mode this must not have.
 */
const MAX_REPEATS = 2;

export interface AutopilotAnswered {
  question: string;
  /** The option autopilot picked, as the user would have seen it. */
  optionLabel: string;
}

export interface AutopilotHeld {
  /** Null when the screen could not be read as a prompt at all. */
  question: string | null;
  hold: AutopilotHold;
  /** The guard that fired, or the option that was refused. */
  matched: string | null;
}

interface RunState {
  timer: NodeJS.Timeout | null;
  /** When prompts were answered, for the rate limit. */
  answeredAt: number[];
  /** Prompt fingerprint -> when it was answered, for the repeat check. */
  repeats: Map<string, number[]>;
}

export interface AutopilotDeps {
  /** Whether autopilot may act on this run's project. Read late, so a toggle
      takes effect on the next prompt rather than the next launch. */
  isActive(runId: string): boolean;
  /** The run's current screen — the detector's rolling tail. */
  getScreen(runId: string): string | null;
  /** True while the run is still believed to be waiting on an answer. */
  isWaiting(runId: string): boolean;
  /** Types into the run and clears its waiting state, as a user answer would. */
  answer(runId: string, keys: string): void;
  onAnswered(runId: string, detail: AutopilotAnswered): void;
  /** Called for every prompt autopilot will not answer. The caller raises the
      ordinary alert from here — this is the only path back to the user. */
  onHeld(runId: string, detail: AutopilotHeld): void;
}

export class Autopilot {
  private readonly runs = new Map<string, RunState>();

  constructor(private readonly deps: AutopilotDeps) {}

  /**
   * Whether this run's prompt should go to autopilot instead of straight to the
   * user. When true the caller must not raise its own alert — `onHeld` does it
   * if autopilot declines.
   */
  willConsider(runId: string): boolean {
    return this.deps.isActive(runId);
  }

  /**
   * Takes on a prompt that has just appeared. Resolves once, after the settle
   * delay, through `onAnswered` or `onHeld`.
   */
  consider(runId: string): void {
    const state = this.stateOf(runId);

    if (state.timer) clearTimeout(state.timer);

    state.timer = setTimeout(() => {
      state.timer = null;

      try {
        this.resolve(runId, state);
      } catch (error) {
        // A bug in here must not swallow the prompt. Hand it back and say so.
        logError("autopilot", "Failed to read a prompt", error);
        this.deps.onHeld(runId, { question: null, hold: "unreadable", matched: null });
      }
    }, SETTLE_MS);
  }

  /** Drops a run's timer and history. */
  forget(runId: string): void {
    const state = this.runs.get(runId);
    if (state?.timer) clearTimeout(state.timer);

    this.runs.delete(runId);
  }

  private stateOf(runId: string): RunState {
    const existing = this.runs.get(runId);
    if (existing) return existing;

    const created: RunState = { timer: null, answeredAt: [], repeats: new Map() };
    this.runs.set(runId, created);

    return created;
  }

  private resolve(runId: string, state: RunState): void {
    // The user got there first, or the agent moved on. Either way there is
    // nothing left to answer and no alert to raise — the prompt is gone.
    if (!this.deps.isWaiting(runId)) return;

    const screen = this.deps.getScreen(runId);

    if (!screen) {
      this.deps.onHeld(runId, { question: null, hold: "unreadable", matched: null });
      return;
    }

    // Read fresh. The prompt that triggered this may have been answered in the
    // settle window, and the tail keeps it visible either way.
    if (detectTerminalIntent(screen).intent !== "question") return;

    const prompt = parseAgentPrompt(screen);

    if (!prompt) {
      this.deps.onHeld(runId, { question: null, hold: "unreadable", matched: null });
      return;
    }

    const verdict = decideAutopilot(prompt);

    if (verdict.action === "hold") {
      this.deps.onHeld(runId, {
        question: prompt.question,
        hold: verdict.hold,
        matched: verdict.matched
      });
      return;
    }

    // The policy is happy; the history checks are the ones it cannot make.
    const now = Date.now();
    const recent = state.answeredAt.filter((at) => now - at < RATE_WINDOW_MS);

    if (recent.length >= MAX_PER_WINDOW) {
      state.answeredAt = recent;
      this.deps.onHeld(runId, {
        question: prompt.question,
        hold: "rate-limit",
        matched: String(recent.length)
      });
      return;
    }

    const seen = (state.repeats.get(prompt.fingerprint) ?? []).filter(
      (at) => now - at < REPEAT_WINDOW_MS
    );

    if (seen.length >= MAX_REPEATS) {
      state.repeats.set(prompt.fingerprint, seen);
      this.deps.onHeld(runId, {
        question: prompt.question,
        hold: "repeat",
        matched: String(seen.length)
      });
      return;
    }

    state.answeredAt = [...recent, now];
    state.repeats.set(prompt.fingerprint, [...seen, now]);

    const submit = prompt.kind === "yes-no" ? "\r" : "";

    this.deps.answer(runId, `${verdict.option.key}${submit}`);
    this.deps.onAnswered(runId, {
      question: prompt.question,
      optionLabel: verdict.option.label
    });
  }
}
