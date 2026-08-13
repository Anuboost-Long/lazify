import type { ComponentType, SVGProps } from "react";
import {
  Activity,
  BellNotification,
  BellNotificationSolid,
  Bug,
  BugSolid,
  ChatBubbleQuestion,
  CheckCircle,
  CheckCircleSolid,
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
  PlaySolid,
  RefreshCircle,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  ShieldXmark,
  Sparks,
  SunLight,
  Pause,
  Terminal,
  Trash,
  WarningTriangle,
  Xmark
} from "iconoir-react";
import {
  ActivitySolid,
  CodeSolid,
  FolderPlusSolid,
  FolderSolid,
  GlobeSolid,
  HardDriveSolid,
  JournalPageSolid,
  MultiWindowSolid,
  PackageSolid,
  SettingsSolid,
  TerminalSolid
} from "./solid-icons";

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
  | "sparks"
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
  /** Draw the filled weight, for selected states. Falls back to the line icon. */
  filled?: boolean;
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
  sparks: Sparks,
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

/**
 * Only the icons that carry a selected state — the sidebar rows and the
 * right-hand tool rails — are drawn twice; every other name stays line-only.
 * `play`, `bell`, `bug` and `check-circle` are the names iconoir already ships
 * a solid weight for; the rest come from ./solid-icons.
 */
const solidIconMap: Partial<Record<UiIconName, ComponentType<SVGProps<SVGSVGElement>>>> = {
  activity: ActivitySolid,
  bell: BellNotificationSolid,
  bug: BugSolid,
  "check-circle": CheckCircleSolid,
  code: CodeSolid,
  folder: FolderSolid,
  "folder-plus": FolderPlusSolid,
  globe: GlobeSolid,
  "hard-drive": HardDriveSolid,
  "journal-page": JournalPageSolid,
  "multi-window": MultiWindowSolid,
  package: PackageSolid,
  play: PlaySolid,
  settings: SettingsSolid,
  terminal: TerminalSolid
};

export default function UiIcon({ name, filled = false, className = "", ...props }: UiIconProps) {
  const Icon = (filled && solidIconMap[name]) || iconMap[name];

  return <Icon aria-hidden="true" className={className} {...props} />;
}
