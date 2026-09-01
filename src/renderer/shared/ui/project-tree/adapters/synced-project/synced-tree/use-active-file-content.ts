import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";

import type { EditorTab } from "@renderer/shared/ui/code/EditorTabBar";
import { needsAssetBytes } from "@renderer/shared/ui/code/preview/file-preview-kind";
import type { FileContentState } from "@renderer/shared/ui/project-tree/core/types";

interface ActiveFileLoad {
	activeFilePath: string | null;
	activeTab: EditorTab | null | undefined;
	projectPath: string;
	fileCache: Record<string, FileContentState>;
	setFileCache: Dispatch<SetStateAction<Record<string, FileContentState>>>;
	activeRequestIdRef: MutableRefObject<number>;
}

export function useActiveFileContent({
	activeFilePath,
	activeTab,
	projectPath,
	fileCache,
	setFileCache,
	activeRequestIdRef,
}: ActiveFileLoad) {
	useEffect(() => {
		if (!activeFilePath) {
			return;
		}

		const currentEntry = fileCache[activeFilePath];

		if (currentEntry?.status === "loaded") {
			return;
		}

		const requestId = activeRequestIdRef.current + 1;
		activeRequestIdRef.current = requestId;

		setFileCache((current) => ({
			...current,
			[activeFilePath]: {
				status: "loading",
				content: current[activeFilePath]?.content ?? "",
			},
		}));

		const filePath = activeTab?.filePath ?? activeFilePath;
		const load: Promise<Omit<FileContentState, "status">> =
			activeTab?.kind === "diff"
				? globalThis.lazify
						.getFileDiff(projectPath, activeTab.filePath, true)
						.then((content) => ({ content }))
				: needsAssetBytes(filePath)
					? globalThis.lazify.readProjectAssetFile(filePath).then((asset) => ({
							content: asset.base64,
							mimeType: asset.mimeType,
							byteLength: asset.byteLength,
						}))
					: globalThis.lazify.readImportedProjectFile(filePath).then((content) => ({ content }));

		void load
			.then((entry) => {
				if (activeRequestIdRef.current !== requestId) {
					return;
				}

				setFileCache((current) => ({
					...current,
					[activeFilePath]: {
						status: "loaded",
						...entry,
					},
				}));
			})
			.catch((error) => {
				if (activeRequestIdRef.current !== requestId) {
					return;
				}

				setFileCache((current) => ({
					...current,
					[activeFilePath]: {
						status: "error",
						content: error instanceof Error ? error.message : "Unable to load file preview.",
					},
				}));
			});
	}, [activeFilePath, activeTab, projectPath]);
}
