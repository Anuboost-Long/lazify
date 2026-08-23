import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Autopilot } from "../../../src/main/agents/autopilot";
import { decideAutopilot } from "../../../src/main/agents/autopilot-policy";
import { AttentionDetector } from "../../../src/main/agents/attention-detector";
import { parseAgentPrompt } from "../../../src/main/agents/prompt-parser";
import { detectTerminalIntent } from "../../../src/main/agents/terminal-intent";

function parse(screen: string) {
  const prompt = parseAgentPrompt(screen);
  expect(prompt).not.toBeNull();
  return prompt!;
}

describe("Agent prompt parsing and autopilot", () => {
  it("approves a narrow routine permission", () => {
    const prompt = parse(
      ["Run npm install", "Do you want to proceed?", "1. Yes", "2. No"].join("\n")
    );

    expect(decideAutopilot(prompt)).toMatchObject({
      action: "answer",
      option: { key: "1", label: "Yes" }
    });
  });

  it("holds an outward-facing git push for the user", () => {
    const prompt = parse(
      ["git push origin main", "Allow this command?", "1. Yes", "2. No"].join("\n")
    );

    expect(decideAutopilot(prompt)).toEqual({
      action: "hold",
      hold: "critical",
      matched: "git-push"
    });
  });

  // pkexec is sudo with a dialog instead of a terminal prompt — the same
  // escalation, and the one a Linux user is most likely to click through.
  it("holds a privilege escalation however the platform spells it", () => {
    for (const command of ["sudo apt-get install -y git", "pkexec /usr/bin/apt-get install -y git"]) {
      const prompt = parse([command, "Allow this command?", "1. Yes", "2. No"].join("\n"));

      expect(decideAutopilot(prompt)).toMatchObject({ action: "hold", matched: "sudo" });
    }
  });

  it("holds scope decisions even when they offer a yes option", () => {
    const prompt = parse(
      ["Should I also update the changelog?", "1. Yes", "2. No"].join("\n")
    );

    expect(decideAutopilot(prompt)).toMatchObject({ action: "hold", hold: "opinion" });
  });

  it("never invents a value for a free-text prompt", () => {
    const prompt = parse("Please enter your API key:");

    expect(decideAutopilot(prompt)).toEqual({
      action: "hold",
      hold: "free-text",
      matched: null
    });
  });

  it("rejects incomplete numbered menus", () => {
    expect(parseAgentPrompt("Allow this command?\n2. No")).toBeNull();
  });
});

describe("Agent terminal activity detection", () => {
  it("detects a blocking permission question", () => {
    expect(
      detectTerminalIntent("Do you want to proceed?\n1. Yes\n2. No")
    ).toMatchObject({ intent: "question" });
  });

  it("does not treat an empty terminal as active", () => {
    expect(detectTerminalIntent("\u001b[0m  ")).toEqual({
      intent: "unknown",
      confidence: 0,
      reasons: [],
      openQuestion: false
    });
  });

  it("reads the idle footer as a finished turn", () => {
    expect(
      detectTerminalIntent("✳ Cooked for 48s\n\n> \n  ? for shortcuts")
    ).toMatchObject({ intent: "complete" });
  });

  it("does not call a finished command a finished turn", () => {
    // What a build prints on its way past, mid-task: the wording of a completion
    // with none of the agent's own end-of-turn furniture behind it.
    expect(
      detectTerminalIntent("✓ 42 tests passed\n✓ Bundled in 1.2s\nBuild completed.")
    ).not.toMatchObject({ intent: "complete" });
  });

  it("keeps a command's completion wording from ending a turn the agent is still in", () => {
    // The same output with the agent's status line still painting underneath it,
    // which is what a screen looks like while a tool call is running.
    expect(
      detectTerminalIntent(
        "✓ Installed 214 packages\ndone in 3.1s\n\n✻ Thinking… (12s · esc to interrupt)"
      )
    ).toMatchObject({ intent: "working" });
  });
});

/** A repaint from an agent that is working: status line over its input box. */
const WORKING_FRAME = [
  "· Thinking… (12s · ↑ 1.2k tokens · esc to interrupt)",
  "",
  "╭──────────────────────────────────────╮",
  "│ >                                    │",
  "╰──────────────────────────────────────╯",
  "  ? for shortcuts"
].join("\n");

/** The same box once the turn has landed and the status line is gone. */
const IDLE_FRAME = [
  "✳ Cooked for 48s",
  "",
  "╭──────────────────────────────────────╮",
  "│ >                                    │",
  "╰──────────────────────────────────────╯",
  "  ? for shortcuts"
].join("\n");

describe("Agent turn-done alerts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Drives one run and counts the turns the detector reported. */
  function agentRun() {
    let turns = 0;
    const detector = new AttentionDetector(() => {
      turns += 1;
    });

    detector.track("run-1");

    return {
      /** Feeds a chunk, then lets `afterMs` of quiet pass. */
      push(chunk: string, afterMs = 0) {
        detector.push("run-1", chunk);
        if (afterMs) vi.advanceTimersByTime(afterMs);
      },
      wait(ms: number) {
        vi.advanceTimersByTime(ms);
      },
      get turns() {
        return turns;
      }
    };
  }

  it("alerts once when the agent hands the work back", () => {
    const run = agentRun();

    run.push(WORKING_FRAME, 400);
    run.push(IDLE_FRAME);
    run.wait(10_000);

    expect(run.turns).toBe(1);
  });

  it("does not alert on every repaint of a turn in progress", () => {
    // The reported bug, as the terminal actually produces it: one task, the
    // status line ticking over, and the idle footer under it in every frame.
    const run = agentRun();

    for (let frame = 0; frame < 20; frame += 1) run.push(WORKING_FRAME, 300);

    expect(run.turns).toBe(0);
  });

  it("alerts once at the end of a turn it stayed quiet through", () => {
    const run = agentRun();

    for (let frame = 0; frame < 20; frame += 1) run.push(WORKING_FRAME, 300);

    run.push(IDLE_FRAME);
    run.wait(10_000);

    expect(run.turns).toBe(1);
  });

  it("holds the alert through a tool call that stops repainting", () => {
    // A long install prints nothing for a stretch while the footer stays on
    // screen — the gap is a pause in the turn, not the end of it.
    const run = agentRun();

    run.push(WORKING_FRAME, 4_000);
    expect(run.turns).toBe(0);

    run.push(WORKING_FRAME, 300);
    expect(run.turns).toBe(0);
  });

  it("stays quiet while the agent works through its commands", () => {
    // Three commands land inside one task. Each prints the words of a
    // completion, and none of them is the task being over.
    const run = agentRun();

    run.push("✻ Thinking… (2s · esc to interrupt)", 500);
    run.push("✓ 42 tests passed\nBuild completed.", 500);
    run.push("✻ Running… (9s · esc to interrupt)", 500);
    run.push("✓ Installed 214 packages\ndone in 3.1s", 500);
    run.push("✻ Editing… (14s · esc to interrupt)", 500);
    run.push("✓ Wrote 3 files\nall set", 500);

    expect(run.turns).toBe(0);
  });
});

describe("Autopilot keystrokes", () => {
  const RUN = "run-1";

  function drive(screen: string) {
    const written: string[] = [];
    const autopilot = new Autopilot({
      isActive: () => true,
      getScreen: () => screen,
      isWaiting: () => true,
      answer: (_runId, keys) => written.push(keys),
      onAnswered: () => {},
      onHeld: () => {}
    });

    vi.useFakeTimers();
    autopilot.consider(RUN);
    vi.advanceTimersByTime(1000);
    vi.useRealTimers();

    return written;
  }

  it("picks a drawn menu option without submitting", () => {
    expect(
      drive(["Run npm install", "Do you want to proceed?", "1. Yes", "2. No"].join("\n"))
    ).toEqual(["1"]);
  });

  it("submits an inline yes/no, which is read as a line", () => {
    expect(drive("Run npm install\nDo you want to proceed? (y/n) ")).toEqual(["y\r"]);
  });
});
