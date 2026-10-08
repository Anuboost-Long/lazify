import type {
	StartTerminalOptions,
	TerminalApi,
	TerminalExit,
	TerminalExitHandler,
	TerminalOutputHandler,
	TerminalSession,
} from "@chain/sdk";

interface FakeSession extends TerminalSession {
	output: string[];
	seq: number;
	input: string[];
}

const chainError = (code: string, message: string) => Object.assign(new Error(message), { code });

const notFound = (id: string) => chainError("NOT_FOUND", `No terminal session ${id}`);

export function createFakeTerminal() {
	const sessions = new Map<string, FakeSession>();
	const outputHandlers = new Set<TerminalOutputHandler>();
	const exitHandlers = new Set<TerminalExitHandler>();
	let nextId = 0;
	let killTimesOut = false;

	const sessionOf = (id: string) => {
		const session = sessions.get(id);
		if (!session) throw notFound(id);

		return session;
	};

	const publicView = ({ output: _output, seq: _seq, input: _input, ...session }: FakeSession): TerminalSession => ({
		...session,
	});

	const api: TerminalApi = {
		async start(options: StartTerminalOptions) {
			nextId += 1;
			const session: FakeSession = {
				id: `t${nextId}`,
				label: options.label ?? "",
				metadata: options.metadata ?? {},
				command: options.command,
				args: options.args ?? [],
				cwd: options.cwd ?? null,
				pid: 1000 + nextId,
				startedAtMs: Date.UTC(2026, 9, 9, 12, 0, nextId),
				cols: options.cols ?? 80,
				rows: options.rows ?? 24,
				exit: null,
				output: [],
				seq: 0,
				input: [],
			};
			sessions.set(session.id, session);

			return publicView(session);
		},
		async list() {
			return [...sessions.values()].map(publicView);
		},
		async backlog(id) {
			const session = sessionOf(id);

			return { data: session.output.join(""), seq: session.seq };
		},
		async attach() {
			throw new Error("not used");
		},
		onOutput(handler) {
			outputHandlers.add(handler);

			return () => outputHandlers.delete(handler);
		},
		onExit(handler) {
			exitHandlers.add(handler);

			return () => exitHandlers.delete(handler);
		},
		async write(id, data) {
			sessionOf(id).input.push(data);
		},
		async resize(id, cols, rows) {
			const session = sessionOf(id);
			session.cols = cols;
			session.rows = rows;
		},
		async kill(id) {
			const session = sessionOf(id);
			if (killTimesOut) throw chainError("TIMEOUT", "still running");
			if (!session.exit) exit(id, { code: null, killed: true });
		},
		async remove(id) {
			sessions.delete(id);
		},
	};

	function print(id: string, data: string) {
		const session = sessionOf(id);
		session.seq += 1;
		session.output.push(data);
		for (const handler of outputHandlers) handler({ sessionId: id, seq: session.seq, data });
	}

	function exit(id: string, result: TerminalExit) {
		sessionOf(id).exit = result;
		for (const handler of exitHandlers) handler(id, result);
	}

	function reloadPage() {
		outputHandlers.clear();
		exitHandlers.clear();
	}

	return {
		api,
		sessions,
		print,
		exit,
		reloadPage,
		makeKillTimeOut: () => {
			killTimesOut = true;
		},
	};
}
