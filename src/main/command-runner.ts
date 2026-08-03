import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";

import { ensureCommandAvailable } from "./environment/scanner";

export type LogStream = "stdout" | "stderr" | "system";

export interface LogEvent {
  id: string;
  timestamp: string;
  stream: LogStream;
  message: string;
}

export interface CommandRequest {
  command: string;
  args: string[];
  cwd?: string;
  /** Extra env merged over the process env for this command. */
  env?: Record<string, string>;
}

export interface CommandResult {
  success: boolean;
  exitCode: number | null;
}

export interface CommandChoiceOption {
  id: string;
  label: string;
}

export interface CommandChoicePrompt {
  id: string;
  commandId: string;
  message: string;
  options: CommandChoiceOption[];
}

type LogEmitter = (event: LogEvent) => void;
type ChoicePromptEmitter = (prompt: CommandChoicePrompt) => void;

interface DetectedChoicePrompt {
  message: string;
  options: Array<CommandChoiceOption & { input: string }>;
}

interface ActiveChoicePrompt {
  child: ChildProcess;
  inputs: Map<string, string>;
}

const ANSI_SEQUENCE = /\u001b(?:\[[0-?]*[ -/]*[@-~]|\][^\u0007]*(?:\u0007|\u001b\\))/g;

export function detectCommandChoicePrompt(output: string): DetectedChoicePrompt | null {
  const lines = output
    .replace(ANSI_SEQUENCE, "")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-30);
  const lastLine = lines.at(-1) ?? "";
  const confirmation = lastLine.match(/^(.*?)(?:\s*[([])([Yy]\/[Nn])(?:[)\]])\s*$/);

  if (confirmation) {
    return {
      message: confirmation[1].trim() || "Choose an option",
      options: [
        { id: "yes", label: "Yes", input: "y\n" },
        { id: "no", label: "No", input: "n\n" },
      ],
    };
  }

  const numberedOptions = lines
    .map((line) => line.match(/^(\d+)[.)]\s+(.+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match));

  if (numberedOptions.length < 2) {
    return null;
  }

  const firstOptionIndex = lines.findIndex((line) => /^(\d+)[.)]\s+/.test(line));
  const promptLine = [...lines.slice(0, firstOptionIndex)].reverse().find((line) => !/^>\s/.test(line));

  return {
    message: promptLine ?? "Choose an option",
    options: numberedOptions.map((match) => ({
      id: `option-${match[1]}`,
      label: match[2].trim(),
      input: `${match[1]}\n`,
    })),
  };
}

export class CommandRunner {
  private readonly activeScripts = new Map<string, ChildProcess>();
  private readonly activeChoicePrompts = new Map<string, ActiveChoicePrompt>();

  constructor(
    private readonly emitLog: LogEmitter,
    private readonly emitChoicePrompt: ChoicePromptEmitter = () => undefined,
  ) {}

  startScript(
    request: CommandRequest,
    emitScriptLog: LogEmitter,
    onDone: (runId: string, exitCode: number | null) => void
  ): string {
    const { command, args, cwd, env } = request;
    const runId = `script-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

    emitScriptLog({
      id: runId,
      timestamp: new Date().toISOString(),
      stream: "system",
      message: `> ${command} ${args.join(" ")}`
    });

    const child = spawn(command, args, {
      cwd,
      env: env ? { ...process.env, ...env } : process.env,
      shell: process.platform === "win32"
    });

    this.activeScripts.set(runId, child);

    child.stdout.on("data", (chunk: Buffer) => {
      emitScriptLog({
        id: runId,
        timestamp: new Date().toISOString(),
        stream: "stdout",
        message: chunk.toString()
      });
    });

    child.stderr.on("data", (chunk: Buffer) => {
      emitScriptLog({
        id: runId,
        timestamp: new Date().toISOString(),
        stream: "stderr",
        message: chunk.toString()
      });
    });

    child.on("error", (error: Error) => {
      emitScriptLog({
        id: runId,
        timestamp: new Date().toISOString(),
        stream: "stderr",
        message: error.message
      });
    });

    child.on("close", (exitCode: number | null) => {
      this.activeScripts.delete(runId);
      emitScriptLog({
        id: runId,
        timestamp: new Date().toISOString(),
        stream: exitCode === 0 ? "system" : "stderr",
        message: exitCode === 0 ? "Process finished." : `Process exited with code ${String(exitCode)}.`
      });
      onDone(runId, exitCode);
    });

    return runId;
  }

  stopScript(runId: string): boolean {
    const child = this.activeScripts.get(runId);
    if (!child) return false;
    child.kill("SIGTERM");
    this.activeScripts.delete(runId);
    return true;
  }

  chooseCommandOption(promptId: string, optionId: string): boolean {
    const prompt = this.activeChoicePrompts.get(promptId);
    const input = prompt?.inputs.get(optionId);

    if (!prompt || !input || !prompt.child.stdin?.writable) {
      return false;
    }

    prompt.child.stdin.write(input);
    this.activeChoicePrompts.delete(promptId);
    return true;
  }

  runCommand(request: CommandRequest): Promise<CommandResult> {
    const { command, args, cwd } = request;
    const commandId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

    ensureCommandAvailable(command);

    this.emitLog({
      id: commandId,
      timestamp: new Date().toISOString(),
      stream: "system",
      message: `> ${command} ${args.join(" ")}`
    });

    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        env: process.env,
        shell: process.platform === "win32"
      });
      let promptBuffer = "";
      let promptTimer: NodeJS.Timeout | null = null;
      let promptSequence = 0;
      const emittedPromptSignatures = new Set<string>();

      const clearCommandPrompts = () => {
        if (promptTimer) clearTimeout(promptTimer);
        for (const [promptId, prompt] of this.activeChoicePrompts) {
          if (prompt.child === child) this.activeChoicePrompts.delete(promptId);
        }
      };

      const inspectForChoicePrompt = () => {
        promptTimer = null;
        const detected = detectCommandChoicePrompt(promptBuffer);
        if (!detected) return;

        const signature = `${detected.message}\u0000${detected.options.map((option) => option.label).join("\u0000")}`;
        if (emittedPromptSignatures.has(signature)) return;
        emittedPromptSignatures.add(signature);

        const promptId = `${commandId}-prompt-${promptSequence++}`;
        this.activeChoicePrompts.set(promptId, {
          child,
          inputs: new Map(detected.options.map((option) => [option.id, option.input])),
        });
        this.emitChoicePrompt({
          id: promptId,
          commandId,
          message: detected.message,
          options: detected.options.map(({ id, label }) => ({ id, label })),
        });
      };

      const queuePromptInspection = (chunk: Buffer) => {
        promptBuffer = `${promptBuffer}${chunk.toString()}`.slice(-8_192);
        if (promptTimer) clearTimeout(promptTimer);
        promptTimer = setTimeout(inspectForChoicePrompt, 40);
      };

      child.stdout.on("data", (chunk: Buffer) => {
        queuePromptInspection(chunk);
        this.emitLog({
          id: commandId,
          timestamp: new Date().toISOString(),
          stream: "stdout",
          message: chunk.toString()
        });
      });

      child.stderr.on("data", (chunk: Buffer) => {
        queuePromptInspection(chunk);
        this.emitLog({
          id: commandId,
          timestamp: new Date().toISOString(),
          stream: "stderr",
          message: chunk.toString()
        });
      });

      child.on("error", (error) => {
        clearCommandPrompts();
        this.emitLog({
          id: commandId,
          timestamp: new Date().toISOString(),
          stream: "stderr",
          message: error.message
        });
        reject(error);
      });

      child.on("close", (exitCode) => {
        clearCommandPrompts();
        const success = exitCode === 0;

        this.emitLog({
          id: commandId,
          timestamp: new Date().toISOString(),
          stream: success ? "system" : "stderr",
          message: success
            ? "Command finished successfully."
            : `Command exited with code ${String(exitCode)}.`
        });

        resolve({
          success,
          exitCode
        });
      });
    });
  }
}
