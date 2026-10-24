import { getImportedTemplatePresentation } from "@/shared/lib/imported-template-presentations";
import type { ProjectStack } from "@/shared/types/lazify";

const STACK_ICONS: Record<string, string> = {
	"expo-default": "react-original",
	"next-default": "nextjs-original",
	"vite-react": "vitejs-plain",
};

/** The devicon a stack's starter is shown with. */
export const stackIconOf = (templateId: string) => STACK_ICONS[templateId] ?? "react-original";

/** The devicon a saved template is shown with, from the stack it was detected as. */
export const savedTemplateIconOf = (stack: ProjectStack) => getImportedTemplatePresentation(stack).iconName;
