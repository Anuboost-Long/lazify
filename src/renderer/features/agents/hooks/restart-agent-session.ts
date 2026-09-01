import {
	announceReplacement,
	beginRestart,
	disposeRun,
	endRestart,
	rebindRun,
} from "@renderer/shared/terminal";

/**
 * Runs an agent's session again in the terminal it is already in.
 *
 * Nothing is closed. The tab, the monitor panel, the terminal and its
 * scrollback all stay where they are — only the process behind them is
 * replaced, which is the one part that cannot be re-themed while it runs. The
 * kill is announced first, so everything that reacts to a session ending knows
 * to sit still.
 *
 * The conversation comes with it. Both CLIs write a transcript as they go, and
 * the newest one for this agent in this project is the session being restarted,
 * so it is resumed rather than replaced. A session nobody has spoken to yet has
 * written no transcript, and has nothing in it to carry over.
 *
 * Answers with the run that took over, or null when none did — the caller owns
 * whatever it is showing and has to know which happened.
 */
export interface RestartableSession {
	runId: string;
	kind: "agent" | "script";
	/** The agent's id, which is what decides the resume flag. */
	sourceId: string;
	projectPath: string;
}

export async function restartAgentSession(session: RestartableSession): Promise<string | null> {
	if (session.kind !== "agent" || !session.runId) return null;

	// Claimed before anything is awaited. Finding the transcript to resume takes
	// a moment, and the session is already promised to a restart by then.
	beginRestart(session.runId);

	const transcripts = await globalThis.lazify.listAgentSessions(session.projectPath).catch(() => []);

	const resumable = transcripts
		.filter((transcript) => transcript.agentId === session.sourceId)
		.sort((left, right) => right.updatedAt - left.updatedAt)
		.at(0);

	try {
		await globalThis.lazify.stopScript(session.runId);

		const { runId } = await globalThis.lazify.openAgentTerminal(
			session.sourceId,
			session.projectPath,
			undefined,
			undefined,
			resumable?.sessionId,
		);

		rebindRun(session.runId, runId);
		announceReplacement(session.runId, runId);

		return runId;
	} catch {
		// The old session is gone and no new one arrived, so what is on screen is
		// showing something that no longer exists.
		endRestart(session.runId);
		disposeRun(session.runId);
		announceReplacement(session.runId, null);

		return null;
	}
}
