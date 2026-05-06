import type { SupportedLanguage } from "@renderer/i18n/i18n";
import { translation } from "@renderer/i18n/translation";
import type { UiIconName } from "@renderer/shared/ui/icons/UiIcon";

export type SettingsSection = "appearance" | "language" | "about";

export const settingsNavItems: {
  id: SettingsSection;
  label: string;
  icon: UiIconName;
  description: string;
}[] = [
  {
    id: "appearance",
    label: translation.Settings.Appearance,
    icon: "sun",
    description: translation.Settings.AppearanceDesc
  },
  {
    id: "language",
    label: translation.Settings.Language,
    icon: "journal-page",
    description: translation.Settings.LanguageDesc
  },
  {
    id: "about",
    label: translation.Settings.About,
    icon: "activity",
    description: translation.Settings.AboutDesc
  }
];

export const themeOptions: { id: string; label: string; icon: UiIconName }[] = [
  {
    id: "dark",
    label: translation.Settings.Dark,
    icon: "moon"
  },
  {
    id: "light",
    label: translation.Settings.Light,
    icon: "sun"
  },
  {
    id: "system",
    label: translation.Settings.System,
    icon: "settings"
  }
];

export const accentOptions = [
  { id: "emerald", color: "bg-emerald-500", label: translation.Settings.Emerald },
  { id: "sky",     color: "bg-sky-500",     label: translation.Settings.Sky     },
  { id: "violet",  color: "bg-violet-500",  label: translation.Settings.Violet  },
  { id: "rose",    color: "bg-rose-500",    label: translation.Settings.Rose    },
  { id: "amber",   color: "bg-amber-500",   label: translation.Settings.Amber   },
  { id: "cyan",    color: "bg-cyan-500",    label: translation.Settings.Cyan    },
  { id: "pink",    color: "bg-pink-500",    label: translation.Settings.Pink    },
  { id: "indigo",  color: "bg-indigo-500",  label: translation.Settings.Indigo  },
];

export const languages: {
  code: SupportedLanguage;
  label: string;
  native: string;
  region: string;
}[] = [
  { code: "en", label: translation.Settings.English, native: "English", region: translation.Settings.UnitedStates },
  { code: "kh", label: translation.Settings.Khmer, native: "ភាសាខ្មែរ", region: translation.Settings.Cambodia },
  { code: "cn", label: translation.Settings.Chinese, native: "中文", region: translation.Settings.China }
];

export const applicationInfoItems = [
  { label: translation.Settings.Version, value: "0.1.0" },
  { label: translation.Settings.Build, value: "development" },
  { label: translation.Settings.Platform, value: "macOS" }
];

export const legalItems = [
  translation.Settings.PrivacyPolicy,
  translation.Settings.TermsOfService,
  translation.Settings.OpenSourceLicenses
];

export const DATE_FORMAT_OPTIONS = [
  { id: "MM/DD/YYYY", label: "MM / DD / YYYY" },
  { id: "DD/MM/YYYY", label: "DD / MM / YYYY" },
  { id: "YYYY-MM-DD", label: "YYYY-MM-DD" },
] as const;

export const TIME_FORMAT_OPTIONS = [
  { id: "12h", label: "12-hour" },
  { id: "24h", label: "24-hour" },
] as const;

export type DateFormatId = (typeof DATE_FORMAT_OPTIONS)[number]["id"];
export type TimeFormatId = (typeof TIME_FORMAT_OPTIONS)[number]["id"];
