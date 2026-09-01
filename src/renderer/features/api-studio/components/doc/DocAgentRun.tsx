import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { XTermPanel } from "@renderer/features/workspace/components/XTermPanel";
import { translation } from "@renderer/i18n/translation";
import { pasteIntoTerminal } from "@renderer/shared/lib/terminal-paste";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface DocAgentRunProps {
	runId: string;
	projectPath: string;
	collectionId: string;
	/** Waiting to be typed into the agent, once it is listening. */
	prompt: string | null;
	onSent: () => void;
	onAnswered: (filled: number, keys: string[]) => void;
	onClose: () => void;
}

const POLL_MS = 2500;
const READY_GRACE_MS = 700;
const READY_TIMEOUT_MS = 8000;
const SUBMIT_DELAY_MS = 250;

export function DocAgentRun({
	runId,
	projectPath,
	collectionId,
	prompt,
	onSent,
	onAnswered,
	onClose,
}: Readonly<DocAgentRunProps>) {
	const { t } = useTranslation();
	const [filled, setFilled] = useState(0);
	const [typed, setTyped] = useState(false);
	const answered = useRef(onAnswered);
	const ready = useRef(false);
	const sent = useRef(onSent);

	answered.current = onAnswered;
	sent.current = onSent;

	const heading = () => {
		if (filled > 0) return t(translation.ApiStudio.DocAnswersLanded, { count: filled });
		if (typed) return t(translation.ApiStudio.DocAgentWorking);

		return t(translation.ApiStudio.DocAgentStarting);
	};

	// The terminal is mounted by this component, so the paste has somewhere to
	// land — and the return that submits it can only follow, never overtake it.
	useEffect(() => {
		if (!prompt) return;

		let cancelled = false;
		let grace: ReturnType<typeof setTimeout> | null = null;
		let waiting: ReturnType<typeof setTimeout> | null = null;
		let stop: (() => void) | null = null;

		const done = () => {
			if (grace) clearTimeout(grace);
			if (waiting) clearTimeout(waiting);

			stop?.();
			grace = null;
			waiting = null;
			stop = null;
		};

		const type = () => {
			if (cancelled) return;

			cancelled = true;
			ready.current = true;
			done();
			pasteIntoTerminal(runId, prompt);
			setTimeout(() => globalThis.lazify.ptyWrite(runId, "\r"), SUBMIT_DELAY_MS);
			setTyped(true);
			sent.current();
		};

		// A session already listening takes the next question straight away; only a
		// cold start waits for the CLI to print something first.
		if (ready.current) {
			type();

			return;
		}

		stop = globalThis.lazify.onPtyData((event) => {
			if (event.runId !== runId || grace) return;

			grace = setTimeout(type, READY_GRACE_MS);
		});

		waiting = setTimeout(type, READY_TIMEOUT_MS);

		return () => {
			cancelled = true;
			done();
		};
	}, [runId, prompt]);

	useEffect(() => {
		let taking = false;

		const take = () => {
			if (taking) return;

			taking = true;
			void globalThis.lazify
				.importCollectionDocDraft(projectPath, collectionId, false, true)
				.then((result) => {
					if (!result || result.filled === 0) return;

					setFilled((current) => current + result.filled);
					answered.current(result.filled, result.filledKeys);
				})
				.catch(() => undefined)
				.finally(() => {
					taking = false;
				});
		};

		void globalThis.lazify.watchCollectionDocDraft(projectPath, collectionId).catch(() => false);

		const stop = globalThis.lazify.onCollectionDocDraftChanged((changed) => {
			if (changed === collectionId) take();
		});

		// Watching is the fast path; polling is the one that cannot miss a write.
		const poll = setInterval(take, POLL_MS);

		return () => {
			stop();
			clearInterval(poll);
			void globalThis.lazify.unwatchCollectionDocDraft(collectionId).catch(() => undefined);
		};
	}, [projectPath, collectionId]);

	return (
		<aside className="flex min-h-0 w-[26rem] shrink-0 flex-col border-l border-border">
			<div className="flex items-center gap-2 border-b border-border px-3 py-2">
				<UiIcon name="sparks" className="h-3.5 w-3.5 shrink-0 text-accent" />
				<span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-text">{heading()}</span>
				<button
					type="button"
					onClick={onClose}
					aria-label={t(translation.ApiStudio.Close)}
					className="shrink-0 text-muted transition-colors hover:text-text"
				>
					<UiIcon name="xmark" className="h-3.5 w-3.5" />
				</button>
			</div>

			<div className={clsx("min-h-0 flex-1 overflow-hidden bg-terminal px-2 py-1.5")}>
				<XTermPanel runId={runId} isActive autoFocus />
			</div>

			<p className="border-t border-border px-3 py-2 text-[10px] leading-4 text-muted">
				{t(translation.ApiStudio.DocAgentRunHint)}
			</p>
		</aside>
	);
}
