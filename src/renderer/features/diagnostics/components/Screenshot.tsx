import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { ArtifactRef } from "@main/diagnostic-tests/types";
import { translation } from "@renderer/i18n/translation";
import { CaptionText } from "@renderer/shared/typography";

export function Screenshot({ artifact }: Readonly<{ artifact: ArtifactRef }>) {
	const { t } = useTranslation();
	const [source, setSource] = useState("");
	const [missing, setMissing] = useState(false);

	useEffect(() => {
		let cancelled = false;

		globalThis.lazify
			.readProjectAssetFile(artifact.filePath)
			.then((asset) => {
				if (!cancelled) setSource(`data:${asset.mimeType};base64,${asset.base64}`);
			})
			.catch(() => {
				if (!cancelled) setMissing(true);
			});

		return () => {
			cancelled = true;
		};
	}, [artifact.filePath]);

	return (
		<figure className="m-0 min-w-0">
			<div className="overflow-hidden rounded-md border border-border bg-bg">
				{missing ? (
					<CaptionText as="p" className="p-3">
						{t(translation.Diagnostics.ScreenshotUnavailable)}
					</CaptionText>
				) : (
					<img src={source} alt={artifact.name} loading="lazy" className="block h-auto w-full" />
				)}
			</div>
			<figcaption>
				<CaptionText as="span" className="mt-1 block truncate">
					{artifact.name}
				</CaptionText>
			</figcaption>
		</figure>
	);
}
