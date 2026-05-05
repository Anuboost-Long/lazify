import { useState } from "react";
import clsx from "clsx";
import {
  LANGUAGE_STORAGE_KEY,
  normalizeLanguage,
  type SupportedLanguage
} from "@renderer/i18n/i18n";
import { translation } from "@renderer/i18n/translation";
import {
  BodyText,
  CaptionText,
  CardTitle,
  MonoText,
  OverlineText,
  SmallText,
  Typography
} from "@renderer/shared/typography";
import { PageHeader } from "@renderer/shared/ui/PageHeader";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";
import type { EnvironmentSummary } from "@renderer/shared/types/lazify";
import { useTranslation } from "react-i18next";

interface SettingsPageProps {
  environment: EnvironmentSummary | null;
}

type Section = "appearance" | "language" | "about";

const navItems: { id: Section; label: string; icon: UiIconName; description: string }[] = [
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

const themeOptions: { id: string; label: string; icon: UiIconName; preview: string }[] = [
  {
    id: "dark",
    label: translation.Settings.Dark,
    icon: "moon",
    preview: "dark"
  },
  {
    id: "light",
    label: translation.Settings.Light,
    icon: "sun",
    preview: "light"
  },
  {
    id: "system",
    label: translation.Settings.System,
    icon: "settings",
    preview: "system"
  }
];

const languages: {
  code: SupportedLanguage;
  label: string;
  native: string;
  region: string;
}[] = [
  { code: "en", label: translation.Settings.English, native: "English", region: translation.Settings.UnitedStates },
  { code: "kh", label: translation.Settings.Khmer, native: "ភាសាខ្មែរ", region: translation.Settings.Cambodia },
  { code: "cn", label: translation.Settings.Chinese, native: "中文", region: translation.Settings.China }
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <OverlineText tone="muted" className="mb-4">
      {children}
    </OverlineText>
  );
}

function SettingRow({
  label,
  description,
  children
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-4">
      <div className="flex-1">
        <BodyText className="font-semibold">{label}</BodyText>
        {description && (
          <SmallText className="mt-0.5 leading-5">{description}</SmallText>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function AppearanceSection() {
  const { t } = useTranslation();
  const [selectedTheme, setSelectedTheme] = useState("dark");
  const [selectedAccent, setSelectedAccent] = useState("emerald");

  const accents = [
    { id: "emerald", color: "bg-emerald-500", label: translation.Settings.Emerald },
    { id: "sky", color: "bg-sky-500", label: translation.Settings.Sky },
    { id: "violet", color: "bg-violet-500", label: translation.Settings.Violet },
    { id: "rose", color: "bg-rose-500", label: translation.Settings.Rose },
    { id: "amber", color: "bg-amber-500", label: translation.Settings.Amber }
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionLabel>{t(translation.Settings.Theme)}</SectionLabel>
        <div className="grid grid-cols-3 gap-3">
          {themeOptions.map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => setSelectedTheme(theme.id)}
              className={clsx(
                "group relative flex flex-col items-center gap-3 rounded-2xl border p-5",
                "transition-all duration-150",
                selectedTheme === theme.id
                  ? "border-accent bg-accentSoft shadow-glow"
                  : "border-border bg-soft hover:border-accent/40"
              )}
            >
              {/* Mock screen preview */}
              <div
                className={clsx(
                  "w-full rounded-xl border p-2 pb-3",
                  theme.id === "light"
                    ? "border-gray-200 bg-gray-100"
                    : theme.id === "dark"
                      ? "border-white/10 bg-[#0b1220]"
                      : "border-white/10 bg-gradient-to-br from-[#0b1220] to-gray-700"
                )}
              >
                <div
                  className={clsx(
                    "mb-2 h-1.5 w-2/3 rounded-full",
                    theme.id === "light" ? "bg-gray-300" : "bg-white/20"
                  )}
                />
                <div className="flex gap-1">
                  <div
                    className={clsx(
                      "h-5 w-5 rounded-md",
                      theme.id === "light" ? "bg-gray-200" : "bg-white/10"
                    )}
                  />
                  <div className="flex-1 space-y-1">
                    <div
                      className={clsx(
                        "h-1 rounded-full",
                        theme.id === "light" ? "bg-gray-300" : "bg-white/20"
                      )}
                    />
                    <div
                      className={clsx(
                        "h-1 w-3/4 rounded-full",
                        theme.id === "light" ? "bg-gray-200" : "bg-white/10"
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <UiIcon
                  name={theme.icon}
                  className={clsx(
                    "h-4 w-4",
                    selectedTheme === theme.id ? "text-accent" : "text-muted"
                  )}
                />
                <Typography
                  as="span"
                  variant="body"
                  className={clsx(
                    "font-semibold",
                    selectedTheme === theme.id ? "text-accent" : "text-muted"
                  )}
                >
                  {t(theme.label)}
                </Typography>
              </div>

              {selectedTheme === theme.id && (
                <span className="absolute right-3 top-3">
                  <UiIcon name="check-circle" className="h-4 w-4 text-accent" />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <SectionLabel>{t(translation.Settings.AccentColor)}</SectionLabel>
        <div
          className={clsx(
            "rounded-2xl border border-border bg-soft p-5",
            "divide-y divide-border"
          )}
        >
          <SettingRow
            label={t(translation.Settings.Color)}
            description={t(translation.Settings.AccentColorDesc)}
          >
            <div className="flex items-center gap-2">
              {accents.map((accent) => (
                <button
                  key={accent.id}
                  type="button"
                  onClick={() => setSelectedAccent(accent.id)}
                  title={t(accent.label)}
                  className={clsx(
                    "h-7 w-7 rounded-full transition-all duration-100",
                    accent.color,
                    selectedAccent === accent.id
                      ? "ring-2 ring-accent ring-offset-2 ring-offset-soft scale-110"
                      : "opacity-60 hover:opacity-100"
                  )}
                />
              ))}
            </div>
          </SettingRow>
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <SectionLabel>{t(translation.Settings.Interface)}</SectionLabel>
        <div
          className={clsx(
            "rounded-2xl border border-border bg-soft",
            "divide-y divide-border"
          )}
        >
          <div className="px-5">
            <SettingRow
              label={t(translation.Settings.CompactSidebar)}
              description={t(translation.Settings.CompactSidebarDesc)}
            >
              <ToggleSwitch enabled={false} />
            </SettingRow>
          </div>
          <div className="px-5">
            <SettingRow
              label={t(translation.Settings.ReduceMotion)}
              description={t(translation.Settings.ReduceMotionDesc)}
            >
              <ToggleSwitch enabled={false} />
            </SettingRow>
          </div>
          <div className="px-5">
            <SettingRow
              label={t(translation.Settings.ShowTooltips)}
              description={t(translation.Settings.ShowTooltipsDesc)}
            >
              <ToggleSwitch enabled={true} />
            </SettingRow>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleSwitch({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setOn((v) => !v)}
      className={clsx(
        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent",
        "transition-colors duration-200 focus:outline-none",
        on ? "bg-accent" : "bg-border"
      )}
    >
      <span
        className={clsx(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow",
          "transition duration-200",
          on ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

function LanguageSection() {
  const { t, i18n } = useTranslation();
  const selected = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);

  const handleLanguageChange = (language: SupportedLanguage) => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    void i18n.changeLanguage(language);
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionLabel>{t(translation.Settings.InterfaceLanguage)}</SectionLabel>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleLanguageChange(lang.code)}
              className={clsx(
                "flex items-center justify-between rounded-2xl border px-4 py-3.5",
                "text-left transition-all duration-150",
                selected === lang.code
                  ? "border-accent bg-accentSoft"
                  : "border-border bg-soft hover:border-accent/40"
              )}
            >
              <div>
                <BodyText
                  className={clsx(
                    "font-semibold",
                    selected === lang.code ? "text-accent" : "text-text"
                  )}
                >
                  {lang.native}
                </BodyText>
                <SmallText className="mt-0.5">
                  {t(lang.label)} · {t(lang.region)}
                </SmallText>
              </div>
              {selected === lang.code && (
                <UiIcon name="check-circle" className="h-4 w-4 text-accent" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <SectionLabel>{t(translation.Settings.DateTime)}</SectionLabel>
        <div
          className={clsx(
            "rounded-2xl border border-border bg-soft",
            "divide-y divide-border"
          )}
        >
          <div className="px-5">
            <SettingRow
              label={t(translation.Settings.DateFormat)}
              description={t(translation.Settings.DateFormatDesc)}
            >
              <SelectChip options={["MM / DD / YYYY", "DD / MM / YYYY", "YYYY-MM-DD"]} />
            </SettingRow>
          </div>
          <div className="px-5">
            <SettingRow label={t(translation.Settings.TimeFormat)} description={t(translation.Settings.TimeFormatDesc)}>
              <SelectChip options={["12-hour", "24-hour"]} />
            </SettingRow>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectChip({ options }: { options: string[] }) {
  const [selected, setSelected] = useState(options[0]);
  return (
    <div className="flex items-center gap-1.5 rounded-[14px] border border-border bg-bg p-1">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => setSelected(opt)}
          className={clsx(
            "rounded-[10px] px-3 py-1 text-xs font-semibold transition-all duration-100",
            selected === opt
              ? "bg-accentSoft text-accent"
              : "text-muted hover:text-text"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function AboutSection({ environment }: { environment: EnvironmentSummary | null }) {
  const { t } = useTranslation();
  const runtimeItems = [
    {
      label: translation.Settings.NodeRuntime,
      value: environment?.nodeVersion ?? t(translation.GlobalTerm.Unavailable),
      icon: "activity" as const
    },
    {
      label: "npm",
      value: environment?.npmVersion ?? t(translation.GlobalTerm.Unavailable),
      icon: "package" as const
    },
    {
      label: "yarn",
      value: environment?.yarnVersion ?? t(translation.GlobalTerm.Unavailable),
      icon: "refresh-circle" as const
    }
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionLabel>{t(translation.Settings.Application)}</SectionLabel>
        <div
          className={clsx(
            "rounded-2xl border border-border bg-soft",
            "divide-y divide-border"
          )}
        >
          {[
            { label: translation.Settings.Version, value: "0.1.0" },
            { label: translation.Settings.Build, value: "development" },
            { label: translation.Settings.Platform, value: "macOS" }
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between px-5 py-4">
              <BodyText className="font-semibold">{t(item.label)}</BodyText>
              <MonoText className="rounded-lg bg-bg px-2.5 py-1">
                {item.value}
              </MonoText>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <SectionLabel>{t(translation.Settings.LocalRuntime)}</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-3">
          {runtimeItems.map((item) => (
            <article
              key={item.label}
              className={clsx(
                "rounded-shell border border-border bg-soft p-5",
                "shadow-panel"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-border bg-bg p-2 text-accent">
                  <UiIcon name={item.icon} className="h-5 w-5" />
                </div>
                <div>
                  <OverlineText>
                    {t(item.label)}
                  </OverlineText>
                  <CardTitle className="mt-1">{item.value}</CardTitle>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <SectionLabel>{t(translation.Settings.Legal)}</SectionLabel>
        <div
          className={clsx(
            "rounded-2xl border border-border bg-soft",
            "divide-y divide-border"
          )}
        >
          {[
            translation.Settings.PrivacyPolicy,
            translation.Settings.TermsOfService,
            translation.Settings.OpenSourceLicenses
          ].map((item) => (
            <div
              key={item}
              className="flex items-center justify-between px-5 py-4"
            >
              <BodyText className="font-semibold">{t(item)}</BodyText>
              <UiIcon name="arrow-right" className="h-4 w-4 text-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SettingsPage({ environment }: SettingsPageProps) {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<Section>("appearance");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t(translation.Settings.Eyebrow)}
        title={t(translation.Settings.Title)}
        description={t(translation.Settings.Description)}
        icon="settings"
      />

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <nav className="flex w-52 flex-shrink-0 flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              className={clsx(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all duration-150",
                activeSection === item.id
                  ? "bg-accentSoft text-accent"
                  : "text-muted hover:bg-soft hover:text-text"
              )}
            >
              <UiIcon
                name={item.icon}
                className={clsx(
                  "h-5 w-5 flex-shrink-0",
                  activeSection === item.id ? "text-accent" : "text-muted"
                )}
              />
              <div>
                <BodyText className="font-semibold leading-none" tone="inherit">{t(item.label)}</BodyText>
                <CaptionText className="mt-1 leading-none opacity-70" tone="inherit">
                  {t(item.description)}
                </CaptionText>
              </div>
            </button>
          ))}
        </nav>

        {/* Content area */}
        <div className="min-w-0 flex-1">
          {activeSection === "appearance" && <AppearanceSection />}
          {activeSection === "language" && <LanguageSection />}
          {activeSection === "about" && <AboutSection environment={environment} />}
        </div>
      </div>
    </div>
  );
}
