import {
	Bot,
	Gauge,
	LayoutGrid,
	ListChecks,
	Network,
	Play,
	ScanSearch,
	Shapes,
	Sparkles,
	Terminal,
	Wifi,
} from "lucide-react";

export const scenes = [
	{
		id: "templates",
		label: "Template composer",
		title: "Compose the right starting point for every project.",
		description:
			"Start from a maintained stack or bring in a saved project template, then shape the scaffold before generation.",
		image: "/showcase/project-scaffolds.png",
		secondaryImage: "/showcase/saved-templates.png",
		secondaryAlt: "Saved project templates inside Lazify",
		alt: "Lazify project scaffolds for Expo, Next.js, React Native, and Vite",
		accent: "#c4b5fd",
		icon: Shapes,
	},
	{
		id: "scripts",
		label: "Project scripts",
		title: "Run your package scripts without typing the command.",
		description:
			"Lazify reads the scripts already defined in package.json and puts a Run button beside each one, with the output in a terminal below.",
		image: "/showcase/project-scripts.png",
		alt: "Lazify project scripts view with runnable development and build commands",
		accent: "#67e8f9",
		icon: Play,
	},
	{
		id: "browser",
		label: "Built-in browser",
		title: "Watch the running app without leaving the workspace.",
		description:
			"Open the local port your dev script just printed, keep the documentation beside it, and never lose the project you are in.",
		image: "/showcase/integrated-browser.png",
		alt: "A local development server previewed inside the Lazify browser",
		accent: "#fb7185",
		icon: Wifi,
	},
	{
		id: "agents",
		label: "Project agents",
		title: "Keep every agent inside the project it is changing.",
		description:
			"Run Claude and Codex side by side while Lazify tracks their sessions, token usage, and how much of each rate-limit window is left.",
		image: "/showcase/agent-usage.png",
		alt: "Claude and Codex sessions in a Lazify project beside their usage limits",
		accent: "#a7f3d0",
		icon: Bot,
	},
	{
		id: "monitor",
		label: "Live monitor",
		title: "Watch every running session on one wall.",
		description:
			"Agents and dev servers from every project on a single grid — expand the one that needs attention, leave the rest running.",
		image: "/showcase/live-monitor.png",
		alt: "Lazify live monitor showing Claude, Codex, and two development servers",
		accent: "#34d399",
		icon: LayoutGrid,
	},
	{
		id: "sonar",
		label: "Sonar scan",
		title: "Read your code with the analyzers an IDE would use.",
		description:
			"SonarQube for IDE and Tailwind CSS run over the project and report findings by file and line — each one ready to hand to an agent.",
		image: "/showcase/sonar-scan.png",
		alt: "Lazify Sonar scan listing analyzer findings by file and line",
		accent: "#38bdf8",
		icon: ScanSearch,
	},
	{
		id: "phases",
		label: "Fix in phases",
		title: "Turn a wall of findings into work an agent can finish.",
		description:
			"Split a scan into phases and each one becomes a task with its own requirements, tracked across every project until it is done.",
		image: "/showcase/fix-in-phases.png",
		alt: "Lazify task list built from a Sonar scan split into phases",
		accent: "#fbbf24",
		icon: ListChecks,
	},
	{
		id: "prompts",
		label: "Prompt builder",
		title: "Decide what an agent is told before it starts.",
		description:
			"Presets turn a task into instructions the same way every time, and project context plugs in as a set you can switch on and off.",
		image: "/showcase/prompt-builder.png",
		alt: "Lazify prompt builder showing a preset template and its variables",
		accent: "#c084fc",
		icon: Sparkles,
	},
	{
		id: "api",
		label: "API Studio",
		title: "Your API collection, read straight from the source.",
		description:
			"Lazify scans the project for routes, keeps each one linked to the file and line that defines it, and sends requests without a second description of your API.",
		image: "/showcase/api-studio.png",
		alt: "Lazify API Studio listing routes discovered from a project's source",
		accent: "#5eead4",
		icon: Network,
	},
	{
		id: "health",
		label: "Project health",
		title: "See maintenance work before it becomes a blocker.",
		description:
			"Outdated packages and security findings stay visible, organized, and one button away from an agent that can act on them.",
		image: "/showcase/project-health.png",
		alt: "Lazify project health view showing outdated packages and security findings",
		accent: "#f97316",
		icon: Gauge,
	},
	{
		id: "toolchain",
		label: "Local toolchain",
		title: "Know what your machine is actually running.",
		description:
			"Agents, runtimes, and package managers with their installed versions — and an install button for whatever is missing.",
		image: "/showcase/local-toolchain.png",
		alt: "Lazify environment view listing installed coding agents and runtimes",
		accent: "#facc15",
		icon: Terminal,
	},
] as const;

export type Scene = (typeof scenes)[number];
export type Preview = { src: string; alt: string };
