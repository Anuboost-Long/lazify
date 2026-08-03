import { describe, expect, it } from "vitest";

import { decideAutopilot } from "../../../src/main/agents/autopilot-policy";
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
});
