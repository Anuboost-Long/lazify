import { CommandRunner, type CommandChoicePrompt, type CommandResult, type LogEvent } from "./command-runner";

export type { CommandChoicePrompt, CommandResult, LogEvent } from "./command-runner";

const logListeners = new Set<(event: LogEvent) => void>();
const promptListeners = new Set<(prompt: CommandChoicePrompt) => void>();

export const commandRunner = new CommandRunner(
	(event) => {
		for (const listener of logListeners) listener(event);
	},
	(prompt) => {
		for (const listener of promptListeners) listener(prompt);
	},
);

export function runCommand(command: string, args: string[], cwd?: string): Promise<CommandResult> {
	return commandRunner.runCommand({ command, args, cwd });
}

export async function chooseCommandOption(promptId: string, optionId: string): Promise<boolean> {
	return commandRunner.chooseCommandOption(promptId, optionId);
}

function subscribe<T>(listeners: Set<(value: T) => void>, callback: (value: T) => void) {
	listeners.add(callback);

	return () => {
		listeners.delete(callback);
	};
}

export const onLog = (callback: (event: LogEvent) => void) => subscribe(logListeners, callback);

export const onCommandChoicePrompt = (callback: (prompt: CommandChoicePrompt) => void) =>
	subscribe(promptListeners, callback);
