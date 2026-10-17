import { describe, expect, it } from "vitest";

import { detectCommandChoicePrompt } from "@/platform/command-runner";

// Electron's fourth case answers a prompt from a real spawned process; here the
// runner sits on desktop.processRunner, so it lives in command-runner.test.ts
// ("turns a y/N question into a choice and answers it on stdin").

describe("detectCommandChoicePrompt", () => {
  it("detects confirmation prompts", () => {
    expect(detectCommandChoicePrompt("Install dependencies? (Y/n)"))?.toEqual({
      message: "Install dependencies?",
      options: [
        { id: "yes", label: "Yes", input: "y\n" },
        { id: "no", label: "No", input: "n\n" }
      ]
    });
  });

  it("detects numbered options from ANSI-colored command output", () => {
    expect(
      detectCommandChoicePrompt(
        "\u001b[36mSelect a package manager\u001b[0m\n1) npm\n2) pnpm\n3) yarn\n"
      )
    ).toEqual({
      message: "Select a package manager",
      options: [
        { id: "option-1", label: "npm", input: "1\n" },
        { id: "option-2", label: "pnpm", input: "2\n" },
        { id: "option-3", label: "yarn", input: "3\n" }
      ]
    });
  });

  it("ignores ordinary console output", () => {
    expect(detectCommandChoicePrompt("Installing packages...\nDone.")).toBeNull();
  });
});
