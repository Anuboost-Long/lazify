import type { ComponentType, SVGProps } from "react";
import {
  Activity,
  BellNotification,
  Bug,
  ChatBubbleQuestion,
  CheckCircle,
  Code,
  Collapse,
  Css3,
  Database,
  Download,
  EmptyPage,
  Expand,
  Folder,
  FolderPlus,
  Globe,
  HalfMoon,
  HardDrive,
  Html5,
  Import,
  JournalPage,
  Menu,
  MediaImage,
  MediaVideo,
  MultiWindow,
  NavArrowLeft,
  NavArrowRight,
  OpenNewWindow,
  Page,
  Plus,
  Package,
  Play,
  RefreshCircle,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  ShieldXmark,
  SunLight,
  Pause,
  Terminal,
  Trash,
  WarningTriangle,
  Xmark
} from "iconoir-react";

export type UiIconName =
  | "activity"
  | "bell"
  | "bug"
  | "chat-question"
  | "check-circle"
  | "code"
  | "css"
  | "database"
  | "download"
  | "empty-page"
  | "expand"
  | "folder"
  | "folder-plus"
  | "globe"
  | "hard-drive"
  | "html"
  | "import"
  | "journal-page"
  | "media-image"
  | "media-video"
  | "multi-window"
  | "open-new-window"
  | "package"
  | "page"
  | "play"
  | "refresh-circle"
  | "settings"
  | "shield"
  | "shield-check"
  | "shield-off"
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
  bell: BellNotification,
  bug: Bug,
  "chat-question": ChatBubbleQuestion,
  "check-circle": CheckCircle,
  code: Code,
  css: Css3,
  database: Database,
  download: Download,
  "empty-page": EmptyPage,
  expand: Expand,
  folder: Folder,
  "folder-plus": FolderPlus,
  globe: Globe,
  "hard-drive": HardDrive,
  html: Html5,
  import: Import,
  "journal-page": JournalPage,
  "media-image": MediaImage,
  "media-video": MediaVideo,
  "multi-window": MultiWindow,
  "open-new-window": OpenNewWindow,
  package: Package,
  page: Page,
  play: Play,
  "refresh-circle": RefreshCircle,
  settings: Settings,
  shield: Shield,
  "shield-check": ShieldCheck,
  "shield-off": ShieldXmark,
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
