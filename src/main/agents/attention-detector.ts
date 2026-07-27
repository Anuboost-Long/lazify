/**
 * Spots the moment an agent stops working and starts waiting on the user.
 *
 * Agents are interactive CLIs rendering a TUI into a PTY — there is no event
 * to subscribe to, so the only signal available is what they print. This
 * watches the tail of each session's output for the shape of a permission
 * prompt and reports the transition into (and out of) "waiting".
 *
 * That makes this a heuristic, and it will drift when an agent restyles its
 * prompts. It is deliberately biased towards missing a prompt rather than
 * crying wolf: a false positive puts a badge on a project that does not need
 * one, which is worse than a late badge.
 */

/** Enough tail to hold a full prompt box, small enough to scan on every chunk. */
const TAIL_LIMIT = 4000;

/**
 * Prompt shapes, matched against ANSI-stripped output.
 *
 * The goal is to catch *any* point where the agent has stopped and is waiting
 * on the user — not just permission prompts but clarifying questions and other
 * interactive menus — because with several projects open the badge is how the
 * user knows which one to go back to. That means erring towards sensitivity:
 * a stray badge is cheaper than an agent stuck unnoticed in another project.
 */
const PROMPT_PATTERNS: RegExp[] = [
  // Claude Code: "Do you want to proceed?" over a numbered pick-list.
  /\b1\.\s*Yes\b[\s\S]{0,400}?\b2\.\s*(No|Yes, and)/i,
  /Do you want to (proceed|make this edit|create|run)\b/i,
  // Codex and friends: a plain allow/deny question.
  /\bAllow (this )?(command|tool|edit)\b.*\?/i,
  /\b(Approve|Permission) (this|required|request)\b/i,
  // Generic y/n confirmation at the end of a line.
  /\?\s*\[y\/n\]\s*$/im,
  // Any interactive selection menu waiting on a choice — the navigation and
  // confirm hints a TUI prints under a pick-list. Catches clarifying questions
  // and custom menus, which are just as blocking as a yes/no approval.
  /\bEnter to (select|confirm|submit|choose|continue)\b/i,
  /\b(Tab|arrow keys?) to (navigate|move|cycle|switch)\b/i,
  /\bEsc to (cancel|exit|go back)\b/i,
  // A question immediately followed by a numbered pick-list of options.
  /\?[\s\S]{0,200}?(?:^|\n)\s*[>❯]?\s*1\.\s+\S/m,
];

/**
 * Output that means the agent went back to work, so a prompt that was showing
 * has been answered. Checked before the prompt patterns.
 */
const RESUMED_PATTERNS: RegExp[] = [
  /esc to interrupt/i,
  /\b(Thinking|Working|Running|Searching|Reading|Editing)[.…]/i,
];

/** Strips CSI/OSC escape sequences so patterns match the visible text. */
export function stripAnsi(value: string): string {
  return (
    value
      // OSC: ESC ] ... terminated by BEL or ESC backslash
      .replace(/\u001b\][\s\S]*?(?:\u0007|\u001b\\)/g, "")
      // CSI and other escape sequences
      .replace(/\u001b[[\]()#;?]*[0-9;]*[A-Za-z]/g, "")
      // Leftover control characters, keeping tab, newline and carriage return
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
  );
}

/**
 * End index of the last match of any pattern in `text`, or -1 when none match.
 *
 * Position matters because agents are full-screen TUIs: their status line
 * ("esc to interrupt") is overwritten in place on a real terminal, but once the
 * repositioning escapes are stripped it lingers in our flattened tail. Asking
 * *where* a signal last appeared — rather than merely whether it is present —
 * lets a prompt that was drawn after that stale text still be recognised.
 */
function lastMatchEnd(text: string, patterns: RegExp[]): number {
  let end = -1;

  for (const pattern of patterns) {
    const scanner = new RegExp(
      pattern.source,
      pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`,
    );

    for (let match = scanner.exec(text); match; match = scanner.exec(text)) {
      end = Math.max(end, match.index + match[0].length);
      // Guard against a zero-width match wedging the loop.
      if (match.index === scanner.lastIndex) scanner.lastIndex += 1;
    }
  }

  return end;
}

interface SessionState {
  tail: string;
  waiting: boolean;
}

export class AttentionDetector {
  private readonly sessions = new Map<string, SessionState>();

  /** Registers a session to watch. Only agent runs should be tracked. */
  track(runId: string): void {
    this.sessions.set(runId, { tail: "", waiting: false });
  }

  forget(runId: string): void {
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

    session.tail = (session.tail + stripAnsi(chunk)).slice(-TAIL_LIMIT);

    // A prompt only counts while nothing that means "back to work" was drawn
    // after it — otherwise a stale status line elsewhere in the window would
    // mask a prompt the agent has actually printed.
    const promptAt = lastMatchEnd(session.tail, PROMPT_PATTERNS);
    const resumedAt = lastMatchEnd(session.tail, RESUMED_PATTERNS);
    const prompting = promptAt !== -1 && promptAt > resumedAt;

    // Set LAZIFY_DEBUG_ATTENTION=1 to trace why a prompt is (not) detected. Logs
    // on a match or a state flip, so ordinary redraw noise stays out.
    if (
      process.env.LAZIFY_DEBUG_ATTENTION &&
      (promptAt !== -1 || prompting !== session.waiting)
    ) {
      console.log(
        `[attention] ${runId} promptAt=${promptAt} resumedAt=${resumedAt} ` +
          `prompting=${prompting} was=${session.waiting} ` +
          `tail=${JSON.stringify(session.tail.slice(-200))}`,
      );
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
