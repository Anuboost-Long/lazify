import type { TemplateOption } from "@renderer/shared/types/lazify";

export interface TemplatePresentation {
  badge: string;
  iconName: string;
  iconClassName: string;
  chipClassName: string;
  frameClassName: string;
  activeGlow: string;
  bestFor: string;
}

const PRESENTATIONS: Record<string, TemplatePresentation> = {
  "expo-default": {
    badge: "Mobile-first",
    iconName: "react-original",
    iconClassName: "text-[2.4rem]",
    chipClassName: "border-sky-400/25 bg-sky-400/10 text-sky-700 dark:text-sky-100",
    frameClassName:
      "border-sky-400/20 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.22),_rgba(8,47,73,0.96))] text-sky-100",
    activeGlow: "shadow-[0_24px_60px_rgba(14,165,233,0.22)]",
    bestFor: "Cross-platform mobile projects with a ready React Native workflow."
  },
  "next-default": {
    badge: "Server-ready",
    iconName: "nextjs-original",
    iconClassName: "text-[2.1rem]",
    chipClassName: "border-slate-300/20 bg-slate-200/10 text-slate-700 dark:text-slate-100",
    frameClassName:
      "border-white/10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_rgba(15,23,42,0.96))] text-white",
    activeGlow: "shadow-[0_24px_60px_rgba(15,23,42,0.35)]",
    bestFor: "Route-heavy web apps that need layouts, SSR, or app-router structure."
  },
  "vite-react": {
    badge: "Fast iteration",
    iconName: "vitejs-plain",
    iconClassName: "text-[2.85rem]",
    chipClassName:
      "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-700 dark:text-fuchsia-100",
    frameClassName:
      "border-fuchsia-400/20 bg-[radial-gradient(circle_at_30%_20%,_rgba(250,204,21,0.34),_transparent_34%),radial-gradient(circle_at_72%_26%,_rgba(168,85,247,0.34),_transparent_38%),linear-gradient(160deg,_rgba(49,26,96,0.96),_rgba(18,24,52,0.98))] text-fuchsia-50",
    activeGlow: "shadow-[0_24px_60px_rgba(168,85,247,0.3)]",
    bestFor: "Fast local iteration and lightweight React apps with a snappier dev loop."
  }
};

const DEFAULT_PRESENTATION: TemplatePresentation = {
  badge: "Custom runtime",
  iconName: "react-original",
  iconClassName: "text-[2.35rem]",
  chipClassName:
    "border-emerald-400/25 bg-emerald-400/10 text-emerald-700 dark:text-emerald-100",
  frameClassName:
    "border-emerald-400/20 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.22),_rgba(6,78,59,0.96))] text-emerald-50",
  activeGlow: "shadow-[0_24px_60px_rgba(16,185,129,0.24)]",
  bestFor: "General React-based scaffolds with an editable starter structure."
};

export function getTemplatePresentation(template: TemplateOption): TemplatePresentation {
  return PRESENTATIONS[template.id] ?? DEFAULT_PRESENTATION;
}
