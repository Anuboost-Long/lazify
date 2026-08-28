import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { CodeSurface } from "@renderer/shared/ui/code/CodeSurface";

import type { ApiResponseSummary } from "../types";
import { ResponseFileCard } from "./ResponseFileCard";
import type { ResponseTab } from "./ResponseToolbar";

interface ResponseBodyProps {
	tab: ResponseTab;
	response: ApiResponseSummary;
	body: string;
	/** The body as far as it is shown — a long one is cut until asked for in full. */
	shown: string;
	fileSize: string;
}

export function ResponseBody({
	tab,
	response,
	body,
	shown,
	fileSize,
}: Readonly<ResponseBodyProps>) {
	const { t } = useTranslation();

	if (tab !== "body") {
		return (
			<ul className="flex flex-col divide-y divide-border">
				{response.headers.map((header) => (
					<li key={header.name} className="flex gap-3 py-1.5 font-mono text-[11px]">
						<span className="w-48 shrink-0 truncate text-muted">{header.name}</span>
						<span className="min-w-0 flex-1 break-all text-text">{header.value}</span>
					</li>
				))}
			</ul>
		);
	}

	if (response.file) {
		return <ResponseFileCard file={response.file} mediaType={response.mediaType} size={fileSize} />;
	}

	if (!body) {
		return <p className="py-4 text-xs text-muted">{t(translation.ApiStudio.NoResponseBody)}</p>;
	}

	/** The editor's own surface: the code theme a user chose applies here too. */
	return (
		<CodeSurface
			variant="flush"
			wrap
			content={shown}
			fileName="response.json"
			label={t(translation.ApiStudio.Response)}
		/>
	);
}
