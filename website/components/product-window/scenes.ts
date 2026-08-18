import {
  Bot,
  Code2,
  Eye,
  Gauge,
  KeyRound,
  LayoutGrid,
  Play,
  Shapes,
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
      "Lazify reads the scripts already defined in package.json and puts a Run button beside each one.",
    image: "/showcase/project-scripts.png",
    alt: "Lazify project scripts view with runnable development and build commands",
    accent: "#67e8f9",
    icon: Play,
  },
  {
    id: "health",
    label: "Project health",
    title: "See maintenance work before it becomes a blocker.",
    description:
      "Outdated packages and security findings stay visible, organized, and ready to hand to an agent.",
    image: "/showcase/project-health.png",
    alt: "Lazify project health view showing outdated packages and security findings",
    accent: "#fbbf24",
    icon: Gauge,
  },
  {
    id: "environment",
    label: "Environment",
    title: "Manage project variables without exposing their values.",
    description:
      "Review, enable, and update environment entries from a focused workspace that keeps sensitive values masked.",
    image: "/showcase/environment-variables.png",
    alt: "Lazify environment variable manager with masked project values",
    accent: "#5eead4",
    icon: KeyRound,
  },
  {
    id: "browser",
    label: "Built-in browser",
    title: "Research and verify without breaking the workspace.",
    description:
      "Keep documentation, repositories, and running previews beside the project they belong to.",
    image: "/showcase/integrated-browser.png",
    alt: "GitHub repository open inside the Lazify built-in browser",
    accent: "#fb7185",
    icon: Eye,
  },
  {
    id: "monitor",
    label: "Live monitor",
    title: "Watch every running session on one wall.",
    description:
      "Follow scripts and agents at the same time, expand the work that needs attention, and leave the rest running.",
    image: "/showcase/live-monitor.png",
    alt: "Lazify live monitor showing a development process, Claude, and Codex",
    accent: "#34d399",
    icon: LayoutGrid,
  },
  {
    id: "agents",
    label: "Project agents",
    title: "Keep every agent inside the project it is changing.",
    description:
      "Run Claude and Codex side by side while Lazify keeps their sessions, usage, and project scope together.",
    image: "/showcase/project-agents.png",
    alt: "Claude and Codex agent sessions open in a Lazify project",
    accent: "#a7f3d0",
    icon: Bot,
  },
  {
    id: "context",
    label: "Code to agent",
    title: "Move code straight into the conversation.",
    description:
      "Select the lines that matter and send them to an agent with the right project already in context.",
    image: "/showcase/code-to-agent.png",
    alt: "Lazify code editor with selected code ready to send to an agent",
    accent: "#6ee7b7",
    icon: Code2,
  },
] as const;

export type Scene = (typeof scenes)[number];
export type Preview = { src: string; alt: string };
