import clsx from "clsx";
import { X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { Preview } from "./scenes";

export function PhotoPreview({
	preview,
	onClose,
}: Readonly<{ preview: Preview; onClose: () => void }>) {
	const closeRef = useRef<HTMLButtonElement>(null);
	const [closing, setClosing] = useState(false);
	const requestClose = useCallback(() => setClosing(true), []);

	useEffect(() => {
		if (!closing) return;

		const timeout = window.setTimeout(onClose, 160);
		return () => window.clearTimeout(timeout);
	}, [closing, onClose]);

	useEffect(() => {
		const previousOverflow = document.body.style.overflow;
		const previousFocus =
			document.activeElement instanceof HTMLElement ? document.activeElement : null;
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") requestClose();
		};

		document.body.style.overflow = "hidden";
		document.addEventListener("keydown", closeOnEscape);
		closeRef.current?.focus();

		return () => {
			document.body.style.overflow = previousOverflow;
			document.removeEventListener("keydown", closeOnEscape);
			previousFocus?.focus();
		};
	}, [requestClose]);

	return createPortal(
		<div
			className={clsx(
				"photo-preview fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 backdrop-blur-md sm:p-8",
				closing && "photo-preview-closing",
			)}
		>
			<button
				type="button"
				className="absolute inset-0 cursor-default focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-emerald-300"
				aria-label="Close screenshot preview"
				onClick={requestClose}
			/>
			<dialog
				open
				className="relative z-10 mx-auto flex max-h-full w-full max-w-[1600px] flex-col overflow-hidden rounded-[14px] border border-white/15 bg-[#07100e] p-0 text-inherit shadow-2xl sm:h-full"
				aria-label="Screenshot preview"
				aria-modal="true"
			>
				<div className="flex h-12 shrink-0 items-center border-b border-white/10 px-4 sm:px-5">
					<span className="font-mono text-[9px] uppercase tracking-[.18em] text-stone-400">
						Screenshot preview
					</span>
					<button
						ref={closeRef}
						type="button"
						className="ml-auto flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-stone-300 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
						aria-label="Close screenshot preview"
						onClick={requestClose}
					>
						<X size={16} />
					</button>
				</div>
				{/* On a phone the panel takes the screenshot's own shape — a full-height
				    sheet around a 3:2 image is mostly empty black. From sm up it fills
				    the screen as before. */}
				<div className="relative aspect-[3024/1964] w-full sm:aspect-auto sm:min-h-0 sm:flex-1">
					<Image
						src={preview.src}
						alt={preview.alt}
						fill
						priority
						sizes="100vw"
						className="object-contain"
					/>
				</div>
			</dialog>
		</div>,
		document.body,
	);
}
