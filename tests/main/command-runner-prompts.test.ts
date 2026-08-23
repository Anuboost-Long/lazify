import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import {
  CommandRunner,
  detectCommandChoicePrompt,
  type CommandChoicePrompt
} from "../../src/main/command-runner";

// Passed as a file rather than `node -e`: on Windows the runner spawns through
// cmd.exe, and a script this size going through shell quoting is a variable the
// test does not mean to have.
const scriptDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-prompt-"));
const askScript = path.join(scriptDirectory, "ask.js");

fs.writeFileSync(
  askScript,
  [
    "const readline = require('node:readline');",
    "const io = readline.createInterface({ input: process.stdin, output: process.stdout });",
    "io.question('Continue? (Y/n)', (answer) => {",
    "  io.close();",
    "  process.exit(answer === 'y' ? 0 : 1);",
    "});"
  ].join("\n")
);

afterAll(() => fs.rmSync(scriptDirectory, { recursive: true, force: true }));

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

  // The only test here that spawns a real process and talks to it over stdio.
  // That costs ~1.5s idle and climbs past the 5s default once vitest's workers
  // are competing for the machine — which is a loaded CI box, not a bug. The
  // budget is generous on purpose: a genuine hang still fails, just later.
  it("writes only a validated option response to the running command", async () => {
    let resolvePrompt: (prompt: CommandChoicePrompt) => void = () => undefined;
    const promptReceived = new Promise<CommandChoicePrompt>((resolve) => {
      resolvePrompt = resolve;
    });
    const runner = new CommandRunner(() => undefined, resolvePrompt);
    const resultPromise = runner.runCommand({
      command: process.execPath,
      args: [askScript]
    });
    const prompt = await promptReceived;

    expect(runner.chooseCommandOption(prompt.id, "not-offered")).toBe(false);
    expect(runner.chooseCommandOption(prompt.id, "yes")).toBe(true);
    await expect(resultPromise).resolves.toMatchObject({ success: true, exitCode: 0 });
  }, 30_000);
});
