import type { ComponentType, SVGProps } from "react";
import {
  Activity,
  CheckCircle,
  Code,
  Collapse,
  Css3,
  Database,
  EmptyPage,
  Folder,
  HalfMoon,
  Html5,
  Import,
  JournalPage,
  Menu,
  MediaImage,
  MediaVideo,
  NavArrowLeft,
  NavArrowRight,
  Page,
  Plus,
  Package,
  Play,
  RefreshCircle,
  Search,
  Settings,
  SunLight,
  Pause,
  Terminal,
  Trash,
  WarningTriangle,
  Xmark
} from "iconoir-react";

export type UiIconName =
  | "activity"
  | "check-circle"
  | "code"
  | "css"
  | "database"
  | "empty-page"
  | "folder"
  | "html"
  | "import"
  | "journal-page"
  | "media-image"
  | "media-video"
  | "package"
  | "page"
  | "play"
  | "refresh-circle"
  | "settings"
  | "sun"
  | "terminal"
  | "warning-triangle"
  | "arrow-right"
  | "moon"
  | "arrow-left"
  | "menu"
  | "search"
  | "xmark"
  | "plus"
  | "collapse"
  | "trash"
  | "stop-circle"
  | "pause";

interface UiIconProps extends SVGProps<SVGSVGElement> {
  name: UiIconName;
  className?: string;
}

const iconMap: Record<UiIconName, ComponentType<SVGProps<SVGSVGElement>>> = {
  activity: Activity,
  "check-circle": CheckCircle,
  code: Code,
  css: Css3,
  database: Database,
  "empty-page": EmptyPage,
  folder: Folder,
  html: Html5,
  import: Import,
  "journal-page": JournalPage,
  "media-image": MediaImage,
  "media-video": MediaVideo,
  package: Package,
  page: Page,
  play: Play,
  "refresh-circle": RefreshCircle,
  settings: Settings,
  sun: SunLight,
  terminal: Terminal,
  "warning-triangle": WarningTriangle,
  "arrow-right": NavArrowRight,
  moon: HalfMoon,
  "arrow-left": NavArrowLeft,
  menu: Menu,
  search: Search,
  xmark: Xmark,
  plus: Plus,
  collapse: Collapse,
  trash: Trash,
  "stop-circle": Pause,
  pause: Pause
};

export default function UiIcon({ name, className = "", ...props }: UiIconProps) {
  const Icon = iconMap[name];

  return <Icon aria-hidden="true" className={className} {...props} />;
}
