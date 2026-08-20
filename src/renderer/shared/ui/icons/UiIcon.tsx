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
  EditPencil,
  EmptyPage,
  Expand,
  Eye,
  EyeClosed,
  Folder,
  FolderPlus,
  GitBranch,
  Globe,
  HalfMoon,
  HardDrive,
  HomeSimple,
  Html5,
  Import,
  JournalPage,
  Key,
  Menu,
  MediaImage,
  MediaVideo,
  MoreHoriz,
  MultiWindow,
  Network,
  NavArrowLeft,
  NavArrowRight,
  OpenNewWindow,
  Page,
  Plus,
  Package,
  Pin,
  PinSolid,
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
  Wrench,
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
  HomeSolid,
  JournalPageSolid,
  KeySolid,
  MultiWindowSolid,
  NetworkSolid,
  PackageSolid,
  SettingsSolid,
  SparksSolid,
  TerminalSolid,
  ToolsSolid
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
  | "edit"
  | "empty-page"
  | "expand"
  | "eye"
  | "eye-off"
  | "folder"
  | "folder-plus"
  | "git-branch"
  | "globe"
  | "hard-drive"
  | "home"
  | "html"
  | "import"
  | "journal-page"
  | "key"
  | "media-image"
  | "media-video"
  | "more"
  | "multi-window"
  | "network"
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
  | "tools"
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
  | "pause"
  | "pin";

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
  edit: EditPencil,
  "empty-page": EmptyPage,
  expand: Expand,
  eye: Eye,
  "eye-off": EyeClosed,
  folder: Folder,
  "folder-plus": FolderPlus,
  "git-branch": GitBranch,
  globe: Globe,
  "hard-drive": HardDrive,
  home: HomeSimple,
  html: Html5,
  import: Import,
  "journal-page": JournalPage,
  key: Key,
  "media-image": MediaImage,
  "media-video": MediaVideo,
  more: MoreHoriz,
  "multi-window": MultiWindow,
  network: Network,
  "open-new-window": OpenNewWindow,
  package: Package,
  pin: Pin,
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
  tools: Wrench,
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
  home: HomeSolid,
  "journal-page": JournalPageSolid,
  key: KeySolid,
  "multi-window": MultiWindowSolid,
  network: NetworkSolid,
  package: PackageSolid,
  pin: PinSolid,
  play: PlaySolid,
  settings: SettingsSolid,
  sparks: SparksSolid,
  terminal: TerminalSolid,
  tools: ToolsSolid
};

export default function UiIcon({ name, filled = false, className = "", ...props }: UiIconProps) {
  const Icon = (filled && solidIconMap[name]) || iconMap[name];

  return <Icon aria-hidden="true" className={className} {...props} />;
}
