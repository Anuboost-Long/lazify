import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";

import type { ApiResponseSummary, ApiSendOutcome } from "../types";
import { ResponseBody } from "./ResponseBody";
import { ResponseToolbar, type ResponseTab } from "./ResponseToolbar";

interface ResponsePanelProps {
	outcome: ApiSendOutcome | null;
	restoredAt: string | null;
	sending: boolean;
}

/** A response of ten thousand lines is read from the top, not all at once. */
const FIRST_LINES = 1_000;

function statusTone(status: number) {
	if (status >= 500) return "bg-error/10 text-error";
	if (status >= 400) return "bg-warning/10 text-warning";
	if (status >= 300) return "bg-text/[0.06] text-muted";

	return "bg-success/10 text-success";
}

function readableSize(bytes: number) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;

	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatted(body: string): string | null {
	try {
		return JSON.stringify(JSON.parse(body), null, 2);
	} catch {
		return null;
	}
}

interface ResponseMetaProps {
	response: ApiResponseSummary;
	restoredAt: string | null;
}

function ResponseMeta({ response, restoredAt }: Readonly<ResponseMetaProps>) {
	const { t } = useTranslation();

	return (
		<div className="flex flex-wrap items-center gap-2">
			<span
				className={clsx(
					"rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold",
					statusTone(response.status),
				)}
			>
				{response.status} {response.statusText}
			</span>
			<span className="font-mono text-[11px] text-muted">{response.durationMs} ms</span>
			<span className="font-mono text-[11px] text-muted">{readableSize(response.bodyBytes)}</span>
			{response.truncated ? (
				<span className="rounded-md bg-warning/10 px-1.5 py-0.5 text-[10px] text-warning">
					{t(translation.ApiStudio.ResponseTruncated)}
				</span>
			) : null}
			{restoredAt ? (
				<span className="text-[10px] text-muted">
					{t(translation.ApiStudio.SavedResponse, {
						when: new Date(restoredAt).toLocaleString(),
					})}
				</span>
			) : null}
		</div>
	);
}

export function ResponsePanel({ outcome, restoredAt, sending }: Readonly<ResponsePanelProps>) {
	const { t } = useTranslation();
	const [tab, setTab] = useState<ResponseTab>("body");
	const [raw, setRaw] = useState(false);
	const [showingAll, setShowingAll] = useState(false);
	/** Both readings are held: switching between them is then a swap, not a parse. */
	const received = outcome?.ok ? outcome.response.body : "";
	const pretty = useMemo(() => formatted(received), [received]);

	useEffect(() => setShowingAll(false), [received]);

	if (sending) {
		return (
			<p className="flex flex-1 items-center justify-center text-xs text-muted">
				{t(translation.ApiStudio.Sending)}
			</p>
		);
	}

	if (!outcome) {
		return (
			<div className="flex flex-1 items-center justify-center px-6 py-8 text-center">
				<p className="max-w-sm text-xs leading-5 text-muted">
					{t(translation.ApiStudio.ResponseEmpty)}
				</p>
			</div>
		);
	}

	if (!outcome.ok) {
		return (
			<div className="flex flex-1 flex-col gap-1.5 px-4 py-3">
				<span className="text-xs font-semibold text-error">
					{t(translation.ApiStudio.RequestFailed)}
				</span>
				<p className="font-mono text-[11px] leading-5 text-muted">{outcome.error}</p>
			</div>
		);
	}

	const formattable = pretty !== null;
	const body = raw || !pretty ? received : pretty;
	const lines = body.split("\n");
	const heldBack = !showingAll && lines.length > FIRST_LINES;
	const shown = heldBack ? lines.slice(0, FIRST_LINES).join("\n") : body;

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="flex items-center justify-between gap-3 px-4 py-2.5">
				<ResponseMeta response={outcome.response} restoredAt={restoredAt} />

				<ResponseToolbar
					tab={tab}
					raw={raw}
					formattable={formattable}
					onRawChange={setRaw}
					onTabChange={setTab}
				/>
			</div>

			{heldBack && tab === "body" ? (
				<button
					type="button"
					onClick={() => setShowingAll(true)}
					className={clsx(
						"flex shrink-0 items-center justify-center gap-2 border-b border-border",
						"bg-warning/[0.06] px-4 py-1.5 text-[11px] text-muted transition-colors",
						"hover:text-text",
					)}
				>
					{t(translation.ApiStudio.ShowingFirstLines, {
						shown: FIRST_LINES,
						total: lines.length,
					})}
					<span className="font-medium text-accent">{t(translation.ApiStudio.ShowAllLines)}</span>
				</button>
			) : null}

			<div
				className={clsx(
					"min-h-0 min-w-0 flex-1",
					tab === "body" && body && !outcome.response.file
						? null
						: "overflow-y-auto overflow-x-hidden px-4 pb-3",
				)}
			>
				<ResponseBody
					tab={tab}
					response={outcome.response}
					body={body}
					shown={shown}
					fileSize={readableSize(outcome.response.bodyBytes)}
				/>
			</div>
		</div>
	);
}
