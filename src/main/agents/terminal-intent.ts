/**
 * Reads what an agent printed and says what it means.
 *
 * Agents are interactive CLIs drawing a TUI into a PTY: there is no event to
 * subscribe to, so their output is the only thing to go on. This turns a slab
 * of that output into one of four readings — the agent is asking, the agent has
 * landed its turn, the agent is still working, or there is nothing to tell.
 *
 * It is a pure function of the text, so the session bookkeeping (which run,
 * which turn, whether an alert was already sent) stays with the caller.
 *
 * Three ideas do the work:
 *
 *  - **Contextual words, weighted.** No single phrase decides anything. Each
 *    signal carries how much it is worth on its own, and a reading needs enough
 *    weight behind it. "Do you want to" is nearly decisive; a line ending in a
 *    question mark, on its own, is not — agents write prose full of them.
 *  - **Position.** A TUI redraws its bottom rows constantly, so the last lines
 *    are what the user is actually looking at. A signal there counts fully; the
 *    same signal further up is likely a leftover from an earlier frame and is
 *    heavily discounted.
 *  - **Order.** Whatever was drawn last owns the screen. A question printed
 *    after the working line is a live question; a working line printed after a
 *    question means the question was answered and is now history.
 *
 * This is still a heuristic and will drift when an agent restyles itself. What
 * it is not is a single regex that can be tripped by one unlucky phrase: every
 * reading here needs corroboration, and the signals that tripped it are
 * reported so a wrong call can be traced rather than guessed at.
 */

export type TerminalIntent = "question" | "complete" | "working" | "unknown";

export interface TerminalIntentResult {
  intent: TerminalIntent;
  /** 0–1: the winning reading's share of all the evidence found. */
  confidence: number;
  /** Signals that fired, tagged `(stale)` when they were above the live region. */
  reasons: string[];
  /**
   * The turn ended on a question nobody is blocked by — "want me to update the
   * plan doc too?" over an input box that is free to be ignored.
   *
   * Only ever set alongside `intent: "complete"`, and deliberately separate from
   * it: the work landed, so the alert is still a completion. This says the
   * completion happens to carry a question, which is the difference between
   * "go back to that project now" and "read it when you get to it".
   */
  openQuestion: boolean;
}

/**
 * How many trailing lines count as "on screen now".
 *
 * Big enough to hold a permission box with its option list and footer, small
 * enough that the transcript scrolled above it does not get an equal vote.
 */
const LIVE_REGION_LINES = 16;

/** What a signal is worth when it is found above the live region. */
const STALE_WEIGHT = 0.35;

/**
 * What a signal is worth on a line that is plainly source being displayed.
 *
 * Agents show diffs and code all day, and code says things like `Do you want
 * to`. Text the agent is *rendering* is not text the agent is *asking*, so a
 * signal landing there is nearly worthless — but not zero, because a prompt
 * about a code change can legitimately quote the code it is asking about.
 */
const CODE_CONTEXT_WEIGHT = 0.3;

/** Evidence a reading needs before it is allowed to win. */
const QUESTION_THRESHOLD = 3;
const COMPLETE_THRESHOLD = 3;

/**
 * Evidence that a finished turn ended on a question. Low on purpose: this only
 * colours a completion alert that is being sent anyway, so being wrong costs a
 * misplaced hint rather than a wasted trip back to the project.
 */
const OPEN_QUESTION_THRESHOLD = 1;

interface Signal {
  /** Reported in `reasons`, so a misfire names itself. */
  name: string;
  pattern: RegExp;
  /** 3 = decisive alone, 2 = strong, 1 = only corroborating. */
  weight: number;
  /**
   * Question signals only: whether this one shows the agent is *stuck* rather
   * than merely curious.
   *
   * The test is an input affordance belonging to the question — options to pick
   * from, a y/n bracket, a field to type into. Words alone never qualify: an
   * agent that asks "should I also update the docs?" and then draws its ordinary
   * input box has finished, and badging that project as blocked sends the user
   * running to a session that needs nothing.
   */
  blocking?: boolean;
}

/**
 * The agent has stopped and cannot continue without an answer.
 *
 * Weighted by how hard each one is to produce by accident: the shape of a
 * pick-list with the caret parked on an option is something only a live menu
 * draws, while the words of a question can turn up in any file being displayed.
 */
const QUESTION_SIGNALS: Signal[] = [
  // A caret sitting on a numbered option — a menu waiting to be chosen from.
  // The caret is whatever glyph the agent picked for it: Claude Code draws ❯,
  // Codex draws ›, and a plain > is common enough to keep.
  { name: "caret-on-option", pattern: /(?:^|\n)\s*[>❯▶→›»▸]\s*\d+[.)]\s+\S/, weight: 3, blocking: true },
  { name: "do-you-want-to", pattern: /\bDo you want to\b/i, weight: 3, blocking: true },
  { name: "yes-no-bracket", pattern: /\??\s*[[(](?:y\/n|yes\/no|Y\/n|y\/N)[\])]/i, weight: 3, blocking: true },
  { name: "waiting-for-you", pattern: /\bwaiting for (?:your|user|a) (?:input|response|reply|answer|approval|confirmation)\b/i, weight: 3, blocking: true },
  // Two numbered options close together: the body of a pick-list.
  { name: "numbered-options", pattern: /(?:^|\n)\s*1[.)]\s+\S[\s\S]{0,300}?(?:^|\n)\s*2[.)]\s+\S/, weight: 2, blocking: true },
  { name: "permission-wording", pattern: /\bpermission (?:required|request(?:ed)?|denied|to (?:run|use|edit|read|write))\b/i, weight: 2, blocking: true },
  { name: "approve-question", pattern: /\b(?:approve|allow|grant|authorize)\b[^\n?]{0,80}\?/i, weight: 2, blocking: true },
  { name: "enter-to-confirm", pattern: /\bEnter to (?:select|confirm|submit|choose|continue|accept)\b/i, weight: 2, blocking: true },
  // A field to type into: "Enter your API key:", "Paste the token:". Blocking
  // with no options at all — which is why "does it offer choices" is the wrong
  // test for whether the user is stuck. Anchored to the start of its own line
  // and to a trailing colon, so the same verbs inside prose ("provide the path
  // when you get a chance") do not read as a prompt.
  { name: "input-request", pattern: /(?:^|\n)\s*(?:please\s+)?(?:enter|type|paste|provide|supply)\b[^\n]{0,60}:\s*$/im, weight: 3, blocking: true },
  // A bare "Tab to navigate" is a menu hint. Modifier-prefixed ("shift+tab to
  // cycle") is the idle footer's mode switch, which is the opposite of a menu.
  { name: "menu-navigation", pattern: /(?<![\w+-])(?:tab|arrow keys?|↑\/↓|up\/down) to (?:navigate|move|cycle|switch|select)\b/i, weight: 2, blocking: true },
  { name: "escape-to-cancel", pattern: /\bEsc(?:ape)? to (?:cancel|exit|go back|reject)\b/i, weight: 1, blocking: true },
  // Words without an affordance. These can mark a turn as having ended on a
  // question, but never on their own make the agent "stuck": the user is free
  // to answer, change the subject, or walk away.
  { name: "asking-the-user", pattern: /\b(?:would you like|should i|shall i|may i|can i|want me to)\b[^\n]{0,120}\?/i, weight: 2 },
  { name: "select-an-option", pattern: /\b(?:select|choose|pick)\s+(?:an?|one|which|from|the)\b/i, weight: 2 },
  // Weakest on purpose: prose ends in question marks all the time.
  { name: "question-line", pattern: /\?\s*$/m, weight: 1 },
];

/**
 * The turn is over and the agent is back at its ordinary input box.
 *
 * The idle footer carries most of the weight here. It is drawn only when the
 * agent is ready for a new instruction, which makes it a far better end-of-turn
 * marker than silence: it says the turn ended rather than merely that nothing
 * has been printed for a while.
 */
const COMPLETE_SIGNALS: Signal[] = [
  { name: "idle-footer-hint", pattern: /(?:shift\+tab to cycle|\? for shortcuts|for shortcuts\b)/i, weight: 3 },
  { name: "idle-footer-mode", pattern: /\b(?:bypass permissions|accept edits|plan mode|auto-accept edits)\s+(?:on|off)\b/i, weight: 3 },
  // The turn-timing line an agent prints when it hands the work back:
  // "✳ Cooked for 48s", "✻ Churned for 1m 12s".
  { name: "turn-duration", pattern: /(?:^|\n)\s*[✳✻✽✢*·]\s*\w+ for \d+(?:m\s*\d+)?s\b/, weight: 2 },
  { name: "completion-word", pattern: /\b(?:done|completed|finished|all set|ready)\b[.!]?\s*$/im, weight: 2 },
  { name: "clean-result", pattern: /\b(?:tests? passed|build succeeded|no changes|nothing to commit|up to date)\b/i, weight: 2 },
  { name: "checked-off", pattern: /(?:^|\n)\s*[✓✔☑]\s+\S/, weight: 1 },
];

/**
 * The agent is mid-task. Its own answer to "are you still there" — agents
 * animate a status line for as long as they are busy, so this is the one signal
 * they emit continuously rather than once.
 */
const WORKING_SIGNALS: Signal[] = [
  { name: "interrupt-hint", pattern: /\besc(?:ape)? to interrupt\b/i, weight: 3 },
  {
    name: "status-verb",
    pattern: /\b(?:thinking|working|running|searching|reading|editing|writing|waiting|analyzing|building|testing|fetching|planning|processing|generating|compiling|installing)\s*[.…]{1,3}/i,
    weight: 3,
  },
  // The live counter an agent prints beside its spinner: "(12s · ↑ 1.2k tokens)".
  { name: "token-counter", pattern: /\(\s*\d+m?\d*s\s*[·•]/, weight: 2 },
  { name: "in-progress-tool", pattern: /\b(?:running|executing|calling)\s+(?:command|tool|script)\b/i, weight: 2 },
];

/** Strips CSI/OSC escape sequences so signals match the visible text. */
export function stripAnsi(value: string): string {
  // Row the last absolute jump landed on, so a jump to a *different* row can
  // stand in for the newline a full-screen TUI never sends.
  let row: number | null = null;

  return (
    value
      // OSC: ESC ] ... terminated by BEL or ESC backslash
      .replace(/\u001b\][\s\S]*?(?:\u0007|\u001b\\)/g, "")
      // Absolute cursor jumps are how a full-screen TUI moves between rows.
      // Codex repaints by position and sends almost no newlines, so dropping
      // these welded its whole screen onto one line and every signal anchored
      // to a line start or end below stopped matching. A jump to a new row is
      // the line break it stands for; a jump within the same row is not.
      .replace(/\u001b\[(\d*)(?:;\d*)?H/g, (_match, target: string) => {
        const next = target ? Number(target) : 1;
        const wrapped = row !== null && next !== row;

        row = next;

        return wrapped ? "\n" : "";
      })
      // Horizontal cursor moves ARE the spacing. A TUI lays a row out by jumping
      // the cursor to each column rather than padding with spaces, so a repaint
      // arrives as "Do<CHA>you<CHA>want<CHA>to" — deleting the escapes welds it
      // into "Doyouwantto" and every multi-word signal above stops matching.
      // One space per jump restores the word boundaries; the column itself is
      // irrelevant to the patterns, only the gap is.
      .replace(/\u001b\[[0-9;]*[GC`a]/g, " ")
      // CSI and other escape sequences. The intermediate-byte class is what
      // lets a cursor-style set (ESC[0 q — note the space before its final
      // byte) be stripped instead of leaking into the text as "[0 q".
      .replace(/\u001b[[\]()#;?]*[0-9;]*[ -/]*[A-Za-z]/g, "")
      // Leftover control characters, keeping tab, newline and carriage return
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
  );
}

/**
 * Flattens a screen to plain lines: escapes gone, carriage returns treated as
 * line breaks so a redraw does not weld two rows into one, and trailing blanks
 * dropped so the live region is measured from real content.
 */
export function normalizeScreen(value: string): string {
  return stripAnsi(value).replace(/\r\n?/g, "\n").replace(/\s+$/, "");
}

/** Character offset where the live region — the last few lines — begins. */
function liveRegionStart(text: string): number {
  let index = text.length;
  let counted = 0;

  while (counted < LIVE_REGION_LINES) {
    const previous = text.lastIndexOf("\n", index - 1);

    if (previous <= 0) return 0;

    // Blank rows do not count against the budget. A TUI that repaints by cursor
    // position emits a row break per redraw, so an idling spinner alone can lay
    // down a dozen empty lines and push the box the user is looking at out of
    // the live region.
    if (text.slice(previous + 1, index).trim()) counted += 1;

    index = previous;
  }

  return index;
}

/**
 * Marks of a line that is source being shown rather than interface being drawn:
 * a diff gutter, a regex or escape sequence, an arrow function, a statement
 * terminator. Any one of them means a phrase on that line was quoted, not asked.
 */
const DISPLAYED_CODE = /^\s*[-+]\s|\\[bsdwn]|=>|[;{]\s*$|\/[gimsuy]*,?\s*$/;

/** The single line `index` falls on. */
function lineAt(text: string, index: number): string {
  const start = text.lastIndexOf("\n", Math.max(0, index - 1)) + 1;
  const end = text.indexOf("\n", index);

  return text.slice(start, end === -1 ? text.length : end);
}

interface ClassScore {
  score: number;
  /** The part of `score` from signals that show the agent is stuck. */
  blockingScore: number;
  /** The part of `score` from question words with no affordance behind them. */
  openScore: number;
  /** End of the last match of any signal in this class, or -1 for none. */
  lastIndex: number;
  reasons: string[];
}

/**
 * Weight and position of one class of signals.
 *
 * Every match is measured, not just the first: a status line that is still in
 * the buffer from three frames ago must not decide where the class "is" when a
 * fresher one exists further down.
 */
function scoreSignals(signals: Signal[], text: string, liveFrom: number): ClassScore {
  let score = 0;
  let blockingScore = 0;
  let openScore = 0;
  let lastIndex = -1;
  const reasons: string[] = [];

  for (const signal of signals) {
    const scanner = new RegExp(
      signal.pattern.source,
      signal.pattern.flags.includes("g") ? signal.pattern.flags : `${signal.pattern.flags}g`,
    );
    let end = -1;
    // Every occurrence is weighed and the strongest one speaks for the signal:
    // a phrase quoted in a diff higher up must not drown out the same phrase
    // being asked for real at the bottom, nor the other way round.
    let best = 0;
    let discounted = "";

    for (let match = scanner.exec(text); match; match = scanner.exec(text)) {
      const at = match.index + match[0].length;
      const live = at >= liveFrom;
      const code = DISPLAYED_CODE.test(lineAt(text, match.index));
      const factor = (live ? 1 : STALE_WEIGHT) * (code ? CODE_CONTEXT_WEIGHT : 1);

      if (factor > best) {
        best = factor;
        discounted = code ? "(code)" : live ? "" : "(stale)";
      }

      end = Math.max(end, at);
      // Guard against a zero-width match wedging the loop.
      if (match.index === scanner.lastIndex) scanner.lastIndex += 1;
    }

    if (end === -1) continue;

    const earned = signal.weight * best;

    score += earned;
    if (signal.blocking) blockingScore += earned;
    else openScore += earned;
    lastIndex = Math.max(lastIndex, end);
    reasons.push(`${signal.name}${discounted}`);
  }

  return { score, blockingScore, openScore, lastIndex, reasons };
}

/**
 * Reads a slab of terminal output — a rolling tail, a single chunk, a whole
 * screen — and reports what the agent is doing.
 *
 * Pass raw PTY bytes or already-stripped text; both are normalised here.
 */
export function detectTerminalIntent(screen: string): TerminalIntentResult {
  const text = normalizeScreen(screen);

  if (!text) {
    return { intent: "unknown", confidence: 0, reasons: [], openQuestion: false };
  }

  const liveFrom = liveRegionStart(text);
  const question = scoreSignals(QUESTION_SIGNALS, text, liveFrom);
  const complete = scoreSignals(COMPLETE_SIGNALS, text, liveFrom);
  const working = scoreSignals(WORKING_SIGNALS, text, liveFrom);
  const total = question.score + complete.score + working.score;

  const decide = (): { intent: TerminalIntent; winner: ClassScore } => {
    // Only *blocking* evidence can make a screen a question. Question words on
    // their own are the agent wondering aloud at the end of a turn, which is a
    // completion that happens to end in a question mark, not a stuck session.
    //
    // The order test stands: a question only counts while nothing that means
    // "back to work" was drawn after it, or an answered prompt still sitting in
    // the buffer would read as live. Blocking is checked first because it
    // outranks everything — an agent that cannot continue has not finished,
    // whatever else is on screen.
    if (question.blockingScore >= QUESTION_THRESHOLD && question.lastIndex > working.lastIndex) {
      return { intent: "question", winner: question };
    }

    // Working beats a finished-looking screen only while it is the fresher of
    // the two: the idle footer is drawn after the last status line, so the
    // ordering is what separates "still going" from "just landed".
    if (working.score > 0 && working.lastIndex > complete.lastIndex) {
      return { intent: "working", winner: working };
    }

    if (complete.score >= COMPLETE_THRESHOLD) {
      return { intent: "complete", winner: complete };
    }

    return {
      intent: "unknown",
      winner: { score: 0, blockingScore: 0, openScore: 0, lastIndex: -1, reasons: [] },
    };
  };

  const { intent, winner } = decide();

  return {
    intent,
    confidence: total > 0 ? Math.min(1, winner.score / total) : 0,
    reasons: winner.reasons,
    // Reported only on a finished turn: mid-task prose is full of questions the
    // agent is asking itself, and none of them are addressed to the user.
    openQuestion: intent === "complete" && question.openScore >= OPEN_QUESTION_THRESHOLD,
  };
}
