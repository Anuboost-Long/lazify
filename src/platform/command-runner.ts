import { desktop } from "@chain/sdk";
import type { ProcessHandle, ProcessOutputChunk } from "@chain/sdk";

import { ensureCommandAvailable } from "@/shared/lib/environment/scanner";

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
	child: ProcessHandle;
	inputs: Map<string, string>;
}

const ANSI_SEQUENCE = /\u001b(?:\[[0-?]*[ -/]*[@-~]|\][^\u0007]*(?:\u0007|\u001b\\))/g; // NOSONAR: ESC and BEL are the sequence being stripped

/** `Overwrite this file? (y/N)` — the bracket rides at the end of the line. */
const CONFIRMATION_SUFFIX = /[([]([Yy]\/[Nn])[)\]]\s*$/;
const NUMBERED_OPTION = /^(\d+)[.)]\s(.+)$/;

export function detectCommandChoicePrompt(output: string): DetectedChoicePrompt | null {
	const lines = output
		.replace(ANSI_SEQUENCE, "")
		.replace(/\r/g, "\n")
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.slice(-30);
	const lastLine = lines.at(-1) ?? "";
	const confirmation = CONFIRMATION_SUFFIX.exec(lastLine);

	if (confirmation) {
		return {
			message: lastLine.slice(0, confirmation.index).trim() || "Choose an option",
			options: [
				{ id: "yes", label: "Yes", input: "y\n" },
				{ id: "no", label: "No", input: "n\n" },
			],
		};
	}

	const numberedOptions = lines
		.map((line) => NUMBERED_OPTION.exec(line))
		.filter((match): match is RegExpExecArray => Boolean(match));

	if (numberedOptions.length < 2) {
		return null;
	}

	const firstOptionIndex = lines.findIndex((line) => /^(\d+)[.)]\s+/.test(line));
	const promptLine = lines
		.slice(0, firstOptionIndex)
		.reverse()
		.find((line) => !/^>\s/.test(line));

	return {
		message: promptLine ?? "Choose an option",
		options: numberedOptions.map((match) => ({
			id: `option-${match[1]}`,
			label: match[2].trim(),
			input: `${match[1]}\n`,
		})),
	};
}

const randomHex = () =>
	Array.from(crypto.getRandomValues(new Uint8Array(3)), (byte) => byte.toString(16).padStart(2, "0")).join("");

export class CommandRunner {
	private readonly activeScripts = new Map<string, ProcessHandle>();
	private readonly activeChoicePrompts = new Map<string, ActiveChoicePrompt>();

	constructor(
		private readonly emitLog: LogEmitter,
		private readonly emitChoicePrompt: ChoicePromptEmitter = () => undefined,
	) {}

	async startScript(
		request: CommandRequest,
		emitScriptLog: LogEmitter,
		onDone: (runId: string, exitCode: number | null) => void,
	): Promise<string> {
		const { command, args, cwd, env } = request;
		const runId = `script-${Date.now()}-${randomHex()}`;

		emitScriptLog({
			id: runId,
			timestamp: new Date().toISOString(),
			stream: "system",
			message: `> ${command} ${args.join(" ")}`,
		});

		let child: ProcessHandle;

		try {
			child = await desktop.processRunner.run(
				command,
				args,
				({ stream, data }: ProcessOutputChunk) => {
					emitScriptLog({
						id: runId,
						timestamp: new Date().toISOString(),
						stream,
						message: data,
					});
				},
				{ cwd, env, keepStdinOpen: true },
			);
		} catch (error) {
			emitScriptLog({
				id: runId,
				timestamp: new Date().toISOString(),
				stream: "stderr",
				message: messageOf(error),
			});
			onDone(runId, null);
			return runId;
		}

		this.activeScripts.set(runId, child);

		void child.exited.then(({ code: exitCode }) => {
			this.activeScripts.delete(runId);
			emitScriptLog({
				id: runId,
				timestamp: new Date().toISOString(),
				stream: exitCode === 0 ? "system" : "stderr",
				message: exitCode === 0 ? "Process finished." : `Process exited with code ${String(exitCode)}.`,
			});
			onDone(runId, exitCode);
		});

		return runId;
	}

	stopScript(runId: string): boolean {
		const child = this.activeScripts.get(runId);
		if (!child) return false;
		void child.kill().catch(() => undefined);
		this.activeScripts.delete(runId);
		return true;
	}

	chooseCommandOption(promptId: string, optionId: string): boolean {
		const prompt = this.activeChoicePrompts.get(promptId);
		const input = prompt?.inputs.get(optionId);

		if (!prompt || !input) {
			return false;
		}

		void prompt.child.write(input).catch(() => undefined);
		this.activeChoicePrompts.delete(promptId);
		return true;
	}

	async runCommand(request: CommandRequest): Promise<CommandResult> {
		const { command, args, cwd } = request;
		const commandId = `${Date.now()}-${randomHex()}`;

		await ensureCommandAvailable(command);

		this.emitLog({
			id: commandId,
			timestamp: new Date().toISOString(),
			stream: "system",
			message: `> ${command} ${args.join(" ")}`,
		});

		return new Promise((resolve, reject) => {
			let child: ProcessHandle | undefined;
			let promptBuffer = "";
			let promptTimer: ReturnType<typeof setTimeout> | null = null;
			let promptSequence = 0;
			const emittedPromptSignatures = new Set<string>();

			const clearCommandPrompts = () => {
				if (promptTimer) clearTimeout(promptTimer);
				for (const [promptId, prompt] of this.activeChoicePrompts) {
					if (prompt.child === child) this.activeChoicePrompts.delete(promptId);
				}
			};

			const inspectForChoicePrompt = () => {
				if (!child) {
					promptTimer = setTimeout(inspectForChoicePrompt, 40);
					return;
				}

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

			const queuePromptInspection = (chunk: string) => {
				promptBuffer = `${promptBuffer}${chunk}`.slice(-8_192);
				if (promptTimer) clearTimeout(promptTimer);
				promptTimer = setTimeout(inspectForChoicePrompt, 40);
			};

			const onOutput = ({ stream, data }: ProcessOutputChunk) => {
				queuePromptInspection(data);
				this.emitLog({
					id: commandId,
					timestamp: new Date().toISOString(),
					stream,
					message: data,
				});
			};

			const onExit = (exitCode: number | null) => {
				clearCommandPrompts();
				const success = exitCode === 0;

				this.emitLog({
					id: commandId,
					timestamp: new Date().toISOString(),
					stream: success ? "system" : "stderr",
					message: success
						? "Command finished successfully."
						: `Command exited with code ${String(exitCode)}.`,
				});

				resolve({
					success,
					exitCode,
				});
			};

			desktop.processRunner
				.run(command, args, onOutput, { cwd, keepStdinOpen: true })
				.then((handle) => {
					child = handle;
					void handle.exited.then(({ code }) => onExit(code));
				})
				.catch((error: unknown) => {
					clearCommandPrompts();
					this.emitLog({
						id: commandId,
						timestamp: new Date().toISOString(),
						stream: "stderr",
						message: messageOf(error),
					});
					reject(error);
				});
		});
	}
}

function messageOf(error: unknown) {
	return (error as { message?: string } | null)?.message ?? String(error);
}
