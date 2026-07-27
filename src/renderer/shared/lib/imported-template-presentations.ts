import type { ProjectStack } from "@renderer/shared/types/lazify";

export interface ImportedTemplatePresentation {
  badge: string;
  iconName: string;
  iconClassName: string;
  chipClassName: string;
  frameClassName: string;
  activeGlow: string;
}

const PRESENTATIONS: Record<ProjectStack, ImportedTemplatePresentation> = {
  "react-vite": {
    badge: "Vite · React",
    iconName: "vitejs-plain",
    iconClassName: "text-[2.85rem]",
    chipClassName: "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-700 dark:text-fuchsia-100",
    frameClassName:
      "border-fuchsia-400/20 bg-[radial-gradient(circle_at_30%_20%,_rgba(250,204,21,0.34),_transparent_34%),radial-gradient(circle_at_72%_26%,_rgba(168,85,247,0.34),_transparent_38%),linear-gradient(160deg,_rgba(49,26,96,0.96),_rgba(18,24,52,0.98))] text-fuchsia-50",
    activeGlow: "shadow-[0_24px_60px_rgba(168,85,247,0.3)]"
  },
  "react-next": {
    badge: "Next.js · React",
    iconName: "nextjs-original",
    iconClassName: "text-[2.1rem]",
    chipClassName: "border-slate-300/20 bg-slate-200/10 text-slate-700 dark:text-slate-100",
    frameClassName:
      "border-white/10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_rgba(15,23,42,0.96))] text-white",
    activeGlow: "shadow-[0_24px_60px_rgba(15,23,42,0.35)]"
  },
  "react-cra": {
    badge: "CRA · React",
    iconName: "react-original",
    iconClassName: "text-[2.4rem]",
    chipClassName: "border-cyan-400/25 bg-cyan-400/10 text-cyan-700 dark:text-cyan-100",
    frameClassName:
      "border-cyan-400/20 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.22),_rgba(8,47,73,0.96))] text-cyan-50",
    activeGlow: "shadow-[0_24px_60px_rgba(34,211,238,0.22)]"
  },
  "react-unknown": {
    badge: "React",
    iconName: "react-original",
    iconClassName: "text-[2.4rem]",
    chipClassName: "border-blue-400/25 bg-blue-400/10 text-blue-700 dark:text-blue-100",
    frameClassName:
      "border-blue-400/20 bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.22),_rgba(23,37,84,0.96))] text-blue-50",
    activeGlow: "shadow-[0_24px_60px_rgba(96,165,250,0.22)]"
  },
  "react-native-expo": {
    badge: "Expo · RN",
    iconName: "react-original",
    iconClassName: "text-[2.4rem]",
    chipClassName: "border-sky-400/25 bg-sky-400/10 text-sky-700 dark:text-sky-100",
    frameClassName:
      "border-sky-400/20 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.22),_rgba(8,47,73,0.96))] text-sky-100",
    activeGlow: "shadow-[0_24px_60px_rgba(14,165,233,0.22)]"
  },
  "react-native-cli": {
    badge: "React Native",
    iconName: "react-original",
    iconClassName: "text-[2.4rem]",
    chipClassName: "border-teal-400/25 bg-teal-400/10 text-teal-700 dark:text-teal-100",
    frameClassName:
      "border-teal-400/20 bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.22),_rgba(4,47,46,0.96))] text-teal-50",
    activeGlow: "shadow-[0_24px_60px_rgba(20,184,166,0.22)]"
  },
  "node-api": {
    badge: "Node.js API",
    iconName: "nodejs-plain",
    iconClassName: "text-[2.6rem]",
    chipClassName: "border-green-400/25 bg-green-400/10 text-green-700 dark:text-green-100",
    frameClassName:
      "border-green-400/20 bg-[radial-gradient(circle_at_top,_rgba(74,222,128,0.22),_rgba(5,46,22,0.96))] text-green-50",
    activeGlow: "shadow-[0_24px_60px_rgba(74,222,128,0.22)]"
  },
  "electron": {
    badge: "Electron",
    iconName: "electron-original",
    iconClassName: "text-[2.5rem]",
    chipClassName: "border-indigo-400/25 bg-indigo-400/10 text-indigo-700 dark:text-indigo-100",
    frameClassName:
      "border-indigo-400/20 bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.22),_rgba(30,27,75,0.96))] text-indigo-50",
    activeGlow: "shadow-[0_24px_60px_rgba(129,140,248,0.22)]"
  },
  "dotnet": {
    badge: ".NET",
    iconName: "dotnetcore-plain",
    iconClassName: "text-[2.5rem]",
    chipClassName: "border-violet-400/25 bg-violet-400/10 text-violet-700 dark:text-violet-100",
    frameClassName:
      "border-violet-400/20 bg-[radial-gradient(circle_at_top,_rgba(167,139,250,0.24),_rgba(46,16,101,0.96))] text-violet-50",
    activeGlow: "shadow-[0_24px_60px_rgba(139,92,246,0.26)]"
  },
  "unknown": {
    badge: "Imported",
    iconName: "react-original",
    iconClassName: "text-[2.35rem]",
    chipClassName: "border-emerald-400/25 bg-emerald-400/10 text-emerald-700 dark:text-emerald-100",
    frameClassName:
      "border-emerald-400/20 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.22),_rgba(6,78,59,0.96))] text-emerald-50",
    activeGlow: "shadow-[0_24px_60px_rgba(16,185,129,0.24)]"
  }
};

export function getImportedTemplatePresentation(
  stack: ProjectStack
): ImportedTemplatePresentation {
  return PRESENTATIONS[stack] ?? PRESENTATIONS["unknown"];
}
