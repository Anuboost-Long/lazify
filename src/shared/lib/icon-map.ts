import { getImportedTemplatePresentation } from "@/shared/lib/imported-template-presentations";
import type { ProjectStack } from "@/shared/types/lazify";

export const techIconMap = {
	electron: "electron-original",
	next: "nextjs-original",
	node: "nodejs-plain",
	npm: "npm-original-wordmark",
	react: "react-original",
	tailwind: "tailwindcss-original",
	typescript: "typescript-plain",
	vite: "vitejs-plain",
	expo: "react-original",
} as const;

export type TechIconKey = keyof typeof techIconMap;

export function getTechIconName(name: string) {
	return techIconMap[name as TechIconKey] ?? `${name}-plain`;
}

/** The devicon a detected project stack is shown with. */
export function projectStackIconName(stack: ProjectStack) {
	return getImportedTemplatePresentation(stack).iconName;
}
