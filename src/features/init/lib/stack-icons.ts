const STACK_ICONS: Record<string, string> = {
	"expo-default": "react-original",
	"next-default": "nextjs-original",
	"vite-react": "vitejs-plain",
};

/** The devicon a stack's starter is shown with. */
export const stackIconOf = (templateId: string) => STACK_ICONS[templateId] ?? "react-original";
