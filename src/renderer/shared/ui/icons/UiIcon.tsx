import type { ComponentType, SVGProps } from "react";
import {
  Activity,
  CheckCircle,
  Folder,
  HalfMoon,
  Menu,
  NavArrowLeft,
  NavArrowRight,
  Package,
  Play,
  RefreshCircle,
  Settings,
  SunLight,
  Terminal,
  WarningTriangle
} from "iconoir-react";

export type UiIconName =
  | "activity"
  | "check-circle"
  | "folder"
  | "package"
  | "play"
  | "refresh-circle"
  | "settings"
  | "sun"
  | "terminal"
  | "warning-triangle"
  | "arrow-right"
  | "moon"
  | "arrow-left"
  | "menu";

interface UiIconProps extends SVGProps<SVGSVGElement> {
  name: UiIconName;
  className?: string;
}

const iconMap: Record<UiIconName, ComponentType<SVGProps<SVGSVGElement>>> = {
  activity: Activity,
  "check-circle": CheckCircle,
  folder: Folder,
  package: Package,
  play: Play,
  "refresh-circle": RefreshCircle,
  settings: Settings,
  sun: SunLight,
  terminal: Terminal,
  "warning-triangle": WarningTriangle,
  "arrow-right": NavArrowRight,
  moon: HalfMoon,
  "arrow-left": NavArrowLeft,
  menu: Menu
};

export default function UiIcon({ name, className = "", ...props }: UiIconProps) {
  const Icon = iconMap[name];

  return <Icon aria-hidden="true" className={className} {...props} />;
}
