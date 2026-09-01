import { useAtom, useSetAtom } from "jotai";
import { useCallback } from "react";

import type { ProjectTreeNode } from "@renderer/shared/types/lazify";

import {
	importedTemplateOptionsAtom,
	selectedImportedTemplateAtom,
	selectedImportedTemplateIdAtom,
} from "./atoms";

export function useImportedTemplates() {
	const [selectedImportedTemplateId, setSelectedImportedTemplateId] = useAtom(
		selectedImportedTemplateIdAtom,
	);
	const [selectedImportedTemplate, setSelectedImportedTemplate] = useAtom(
		selectedImportedTemplateAtom,
	);
	const setImportedTemplateOptions = useSetAtom(importedTemplateOptionsAtom);

	const refreshImportedTemplates = useCallback(async () => {
		const templates = await globalThis.lazify.listImportedTemplates();
		setImportedTemplateOptions(templates);

		if (templates.length === 0) {
			setSelectedImportedTemplateId("");
			setSelectedImportedTemplate(null);
			return templates;
		}

		if (!selectedImportedTemplateId) {
			setSelectedImportedTemplate(null);
			return templates;
		}

		const resolvedId = templates.some((template) => template.id === selectedImportedTemplateId)
			? selectedImportedTemplateId
			: "";

		if (!resolvedId) {
			setSelectedImportedTemplateId("");
			setSelectedImportedTemplate(null);
			return templates;
		}

		const detail = await globalThis.lazify.getImportedTemplate(resolvedId);

		setSelectedImportedTemplateId(resolvedId);
		setSelectedImportedTemplate(detail);
		return templates;
	}, [
		selectedImportedTemplateId,
		setImportedTemplateOptions,
		setSelectedImportedTemplate,
		setSelectedImportedTemplateId,
	]);

	const loadImportedTemplate = useCallback(
		async (templateId: string) => {
			if (!templateId) {
				setSelectedImportedTemplateId("");
				setSelectedImportedTemplate(null);
				return;
			}

			const detail = await globalThis.lazify.getImportedTemplate(templateId);
			setSelectedImportedTemplateId(templateId);
			setSelectedImportedTemplate(detail);
		},
		[setSelectedImportedTemplate, setSelectedImportedTemplateId],
	);

	const saveImportedTemplateChanges = useCallback(
		async (
			templateId: string,
			updates: { name?: string | null; tree?: ProjectTreeNode[] | null },
		) => {
			const detail = await globalThis.lazify.updateImportedTemplate(templateId, updates);
			await refreshImportedTemplates();
			setSelectedImportedTemplateId(detail.id);
			setSelectedImportedTemplate(detail);
			return detail;
		},
		[refreshImportedTemplates, setSelectedImportedTemplate, setSelectedImportedTemplateId],
	);

	const removeImportedTemplate = useCallback(
		async (templateId: string) => {
			await globalThis.lazify.deleteImportedTemplate(templateId);
			await refreshImportedTemplates();
		},
		[refreshImportedTemplates],
	);

	return {
		selectedImportedTemplate,
		selectedImportedTemplateId,
		setSelectedImportedTemplateId,
		refreshImportedTemplates,
		loadImportedTemplate,
		saveImportedTemplateChanges,
		removeImportedTemplate,
	};
}
