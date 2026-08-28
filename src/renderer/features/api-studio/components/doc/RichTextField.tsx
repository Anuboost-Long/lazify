import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";

import { htmlToMarkdown, markdownToHtml } from "../../doc-text";

interface RichTextFieldProps {
	value: string;
	placeholder: string;
	minHeight?: string;
	onChange: (markdown: string) => void;
}

interface ToolProps {
	label: string;
	glyph: string;
	onApply: () => void;
}

function Tool({ label, glyph, onApply }: Readonly<ToolProps>) {
	return (
		<button
			type="button"
			title={label}
			aria-label={label}
			onMouseDown={(event) => {
				event.preventDefault();
				onApply();
			}}
			className={clsx(
				"flex h-6 min-w-6 items-center justify-center rounded-md px-1.5",
				"font-mono text-[11px] text-muted transition-colors hover:bg-text/[0.06] hover:text-text",
			)}
		>
			{glyph}
		</button>
	);
}

export function RichTextField({
	value,
	placeholder,
	minHeight = "5rem",
	onChange,
}: Readonly<RichTextFieldProps>) {
	const { t } = useTranslation();
	const field = useRef<HTMLDivElement>(null);
	const typing = useRef(false);
	const [linking, setLinking] = useState(false);
	const [href, setHref] = useState("");

	useEffect(() => {
		if (typing.current || !field.current) return;

		field.current.innerHTML = markdownToHtml(value);
	}, [value]);

	const read = () => {
		if (field.current) onChange(htmlToMarkdown(field.current));
	};

	const command = (name: string, argument?: string) => {
		field.current?.focus();
		document.execCommand(name, false, argument); // NOSONAR: deprecated, but still the only API that formats a contentEditable selection
		read();
	};

	const applyLink = () => {
		const url = href.trim();

		if (url) command("createLink", url);

		setHref("");
		setLinking(false);
	};

	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex flex-wrap items-center gap-0.5">
				<Tool label={t(translation.ApiStudio.RichBold)} glyph="B" onApply={() => command("bold")} />
				<Tool label={t(translation.ApiStudio.RichItalic)} glyph="I" onApply={() => command("italic")} />
				<Tool
					label={t(translation.ApiStudio.RichCode)}
					glyph="‹›"
					onApply={() => command("formatBlock", "pre")}
				/>
				<Tool
					label={t(translation.ApiStudio.RichHeading)}
					glyph="H"
					onApply={() => command("formatBlock", "h4")}
				/>
				<Tool
					label={t(translation.ApiStudio.RichBullets)}
					glyph="•"
					onApply={() => command("insertUnorderedList")}
				/>
				<Tool
					label={t(translation.ApiStudio.RichNumbers)}
					glyph="1."
					onApply={() => command("insertOrderedList")}
				/>
				<Tool
					label={t(translation.ApiStudio.RichLink)}
					glyph="↗"
					onApply={() => setLinking((open) => !open)}
				/>
			</div>

			{linking ? (
				<div className="flex items-center gap-1.5">
					<input
						value={href}
						autoFocus
						spellCheck={false}
						placeholder={t(translation.ApiStudio.RichLinkUrl)}
						onChange={(event) => setHref(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter") applyLink();
							if (event.key === "Escape") setLinking(false);
						}}
						className={clsx(
							"h-7 min-w-0 flex-1 rounded-md border border-border bg-bg/45 px-2",
							"text-[11px] text-text outline-none focus:border-accent/50",
						)}
					/>
					<button
						type="button"
						onMouseDown={(event) => {
							event.preventDefault();
							applyLink();
						}}
						className={clsx(
							"h-7 shrink-0 rounded-md border border-border px-2",
							"text-[11px] text-text transition-colors hover:border-accent/40",
						)}
					>
						{t(translation.ApiStudio.RichApply)}
					</button>
				</div>
			) : null}

			<div className="relative">
				<div // NOSONAR: a textarea cannot hold formatted text, so the rich field is a contentEditable div — which is exactly what role="textbox" annotates
					ref={field}
					role="textbox"
					tabIndex={0}
					aria-multiline="true"
					aria-label={placeholder}
					contentEditable
					suppressContentEditableWarning
					style={{ minHeight }}
					onFocus={() => {
						typing.current = true;
					}}
					onBlur={() => {
						typing.current = false;
						read();
					}}
					onInput={read}
					onPaste={(event) => {
						event.preventDefault();
						document.execCommand("insertText", false, event.clipboardData.getData("text/plain")); // NOSONAR: deprecated, but the paste has to land in the selection as plain text
					}}
					className={clsx(
						"doc-rich-text w-full rounded-lg border border-border bg-bg/45 px-3 py-2",
						"text-xs leading-6 text-text outline-none focus:border-accent/50",
					)}
				/>

				{value.trim() ? null : (
					<span className="pointer-events-none absolute left-3 top-2 text-xs text-muted/70">
						{placeholder}
					</span>
				)}
			</div>
		</div>
	);
}
