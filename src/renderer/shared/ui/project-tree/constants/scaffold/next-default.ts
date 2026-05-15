export const NEXT_PACKAGE_JSON = `{
  "name": "project-name",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
`

export const NEXT_CONFIG = `/** @type {import("next").NextConfig} */
const nextConfig = {}

module.exports = nextConfig
`

export const NEXT_APP_LAYOUT = `import type { Metadata } from "next"
import type { ReactNode } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "My App",
  description: "Admin starter scaffold with routing, translations, and global state."
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
`

export const NEXT_APP_PAGE = `import { redirect } from "next/navigation"

export default function RootPage() {
  redirect("/en")
}
`

export const NEXT_GLOBALS_CSS = `:root {
  --background: #f4f7fb;
  --surface: #ffffff;
  --surface-soft: #edf2f7;
  --border: #d7e0ea;
  --text: #102033;
  --muted: #5c6c80;
  --accent: #047857;
  --accent-strong: #065f46;
  --shadow: 0 24px 80px rgba(15, 23, 42, 0.08);
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100%;
  background: var(--background);
  color: var(--text);
  font-family: Arial, sans-serif;
}

a {
  color: inherit;
  text-decoration: none;
}

button,
select {
  font: inherit;
}

body {
  min-height: 100vh;
}

.shell {
  display: grid;
  min-height: 100vh;
  grid-template-columns: 280px minmax(0, 1fr);
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
  border-right: 1px solid var(--border);
  background: linear-gradient(180deg, #0f172a 0%, #12243d 100%);
  color: #f8fafc;
  padding: 28px;
}

.sidebar-kicker {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #10B981;
}

.sidebar-title {
  margin: 12px 0 0;
  font-size: 28px;
}

.sidebar-copy {
  margin: 12px 0 0;
  color: rgba(248, 250, 252, 0.74);
  line-height: 1.6;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.nav-link {
  border: 1px solid transparent;
  border-radius: 16px;
  padding: 14px 16px;
  color: rgba(248, 250, 252, 0.78);
}

.nav-link:hover,
.nav-link-active {
  border-color: rgba(16, 185, 129, 0.28);
  background: rgba(255, 255, 255, 0.06);
  color: #ffffff;
}

.shell-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.shell-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--border);
  padding: 20px 28px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(16px);
}

.toggle-button,
.locale-switcher select {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  color: var(--text);
  padding: 10px 14px;
}

.locale-switcher {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: var(--muted);
}

.shell-content {
  padding: 28px;
}

.page-eyebrow {
  display: inline-block;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-strong);
}

.page-title {
  margin: 12px 0 0;
  font-size: clamp(32px, 4vw, 44px);
  line-height: 1.05;
}

.page-copy {
  max-width: 720px;
  margin: 16px 0 0;
  color: var(--muted);
  line-height: 1.7;
}

.card-grid,
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 28px;
}

.card,
.stat-card {
  border: 1px solid var(--border);
  border-radius: 24px;
  background: var(--surface);
  box-shadow: var(--shadow);
  padding: 22px;
}

.card h2,
.stat-card strong {
  margin: 0;
}

.card p,
.stat-card span {
  display: block;
  margin: 10px 0 0;
  color: var(--muted);
  line-height: 1.6;
}

.stat-card strong {
  display: block;
  margin-top: 14px;
  font-size: 28px;
  color: var(--text);
}

@media (max-width: 960px) {
  .shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    border-right: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .card-grid,
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
`

export const NEXT_LOCALE_LAYOUT = `import type { ReactNode } from "react"
import { notFound } from "next/navigation"
import { AppShell } from "@/components/navigation/app-shell"
import { I18nProvider } from "@/components/shared/i18n-provider"
import { appLocales } from "@/types/navigation"

export function generateStaticParams() {
  return appLocales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params
}: Readonly<{
  children: ReactNode
  params: Promise<{ locale: string }> | { locale: string }
}>) {
  const { locale } = await Promise.resolve(params)

  if (!appLocales.includes(locale as (typeof appLocales)[number])) {
    notFound()
  }

  return (
    <I18nProvider locale={locale}>
      <AppShell locale={locale}>{children}</AppShell>
    </I18nProvider>
  )
}
`

export const NEXT_LOCALE_PAGE = `"use client"

import { useTranslation } from "react-i18next"

export default function HomePage() {
  const { t } = useTranslation()

  return (
    <section>
      <span className="page-eyebrow">{t("HomePage.eyebrow")}</span>
      <h1 className="page-title">{t("HomePage.title")}</h1>
      <p className="page-copy">{t("HomePage.description")}</p>

      <div className="card-grid">
        <article className="card">
          <h2>{t("HomePage.cards.routing.title")}</h2>
          <p>{t("HomePage.cards.routing.description")}</p>
        </article>
        <article className="card">
          <h2>{t("HomePage.cards.translation.title")}</h2>
          <p>{t("HomePage.cards.translation.description")}</p>
        </article>
        <article className="card">
          <h2>{t("HomePage.cards.state.title")}</h2>
          <p>{t("HomePage.cards.state.description")}</p>
        </article>
      </div>
    </section>
  )
}
`

export const NEXT_DASHBOARD_PAGE = `"use client"

import { useTranslation } from "react-i18next"

export default function DashboardPage() {
  const { t } = useTranslation()

  return (
    <section>
      <span className="page-eyebrow">{t("DashboardPage.eyebrow")}</span>
      <h1 className="page-title">{t("DashboardPage.title")}</h1>
      <p className="page-copy">{t("DashboardPage.description")}</p>

      <div className="stats-grid">
        <article className="stat-card">
          <span>{t("DashboardPage.metrics.revenue.label")}</span>
          <strong>{t("DashboardPage.metrics.revenue.value")}</strong>
        </article>
        <article className="stat-card">
          <span>{t("DashboardPage.metrics.activeUsers.label")}</span>
          <strong>{t("DashboardPage.metrics.activeUsers.value")}</strong>
        </article>
        <article className="stat-card">
          <span>{t("DashboardPage.metrics.conversion.label")}</span>
          <strong>{t("DashboardPage.metrics.conversion.value")}</strong>
        </article>
      </div>
    </section>
  )
}
`

export const NEXT_SETTINGS_PAGE = `"use client"

import { useTranslation } from "react-i18next"

export default function SettingsPage() {
  const { t } = useTranslation()

  return (
    <section>
      <span className="page-eyebrow">{t("SettingsPage.eyebrow")}</span>
      <h1 className="page-title">{t("SettingsPage.title")}</h1>
      <p className="page-copy">{t("SettingsPage.description")}</p>

      <div className="card-grid">
        <article className="card">
          <h2>{t("SettingsPage.preferences.language.title")}</h2>
          <p>{t("SettingsPage.preferences.language.description")}</p>
        </article>
        <article className="card">
          <h2>{t("SettingsPage.preferences.workspace.title")}</h2>
          <p>{t("SettingsPage.preferences.workspace.description")}</p>
        </article>
      </div>
    </section>
  )
}
`

export const NEXT_APP_SHELL = `"use client"

import type { ReactNode } from "react"
import { useEffect } from "react"
import { useAtom, useSetAtom } from "jotai"
import { useTranslation } from "react-i18next"
import { NavLink } from "@/components/navigation/nav-link"
import { LocaleSwitcher } from "@/components/shared/locale-switcher"
import {
  activeWorkspaceAtom,
  localePreferenceAtom,
  sidebarOpenAtom
} from "@/store/app-store"

export function AppShell({
  children,
  locale
}: Readonly<{
  children: ReactNode
  locale: string
}>) {
  const { t } = useTranslation()
  const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom)
  const setActiveWorkspace = useSetAtom(activeWorkspaceAtom)
  const setLocalePreference = useSetAtom(localePreferenceAtom)

  useEffect(() => {
    setLocalePreference(locale === "km" ? "km" : "en")
  }, [locale, setLocalePreference])

  return (
    <div className="shell">
      <aside className={sidebarOpen ? "sidebar is-open" : "sidebar"}>
        <div>
          <p className="sidebar-kicker">{t("Shell.brandKicker")}</p>
          <h1 className="sidebar-title">{t("Shell.brandTitle")}</h1>
          <p className="sidebar-copy">{t("Shell.brandDescription")}</p>
        </div>

        <nav className="sidebar-nav" aria-label={t("Shell.navigationLabel")}>
          <NavLink href={\`/\${locale}\`} onNavigate={() => setActiveWorkspace("overview")}>
            {t("Shell.links.overview")}
          </NavLink>
          <NavLink href={\`/\${locale}/dashboard\`} onNavigate={() => setActiveWorkspace("dashboard")}>
            {t("Shell.links.dashboard")}
          </NavLink>
          <NavLink href={\`/\${locale}/settings\`} onNavigate={() => setActiveWorkspace("settings")}>
            {t("Shell.links.settings")}
          </NavLink>
        </nav>
      </aside>

      <div className="shell-main">
        <header className="shell-header">
          <button
            type="button"
            className="toggle-button"
            onClick={() => setSidebarOpen((current) => !current)}
          >
            {sidebarOpen ? t("Shell.collapse") : t("Shell.expand")}
          </button>
          <LocaleSwitcher />
        </header>
        <main className="shell-content">{children}</main>
      </div>
    </div>
  )
}
`

export const NEXT_NAV_LINK = `"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function NavLink({
  href,
  children,
  onNavigate
}: Readonly<{
  href: string
  children: ReactNode
  onNavigate?: () => void
}>) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(\`\${href}/\`)

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn("nav-link", active && "nav-link-active")}
    >
      {children}
    </Link>
  )
}
`

export const NEXT_I18N_PROVIDER = `"use client"

import type { ReactNode } from "react"
import { useEffect } from "react"
import { I18nextProvider } from "react-i18next"
import i18n from "@/i18n/config"

export function I18nProvider({
  children,
  locale
}: Readonly<{
  children: ReactNode
  locale: string
}>) {
  useEffect(() => {
    void i18n.changeLanguage(locale)
  }, [locale])

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
`

export const NEXT_LOCALE_SWITCHER = `"use client"

import { useSetAtom } from "jotai"
import { usePathname, useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { replaceLocaleInPath } from "@/lib/navigation"
import { localePreferenceAtom } from "@/store/app-store"
import type { AppLocale } from "@/types/navigation"

export function LocaleSwitcher() {
  const { t, i18n } = useTranslation()
  const pathname = usePathname()
  const router = useRouter()
  const setLocalePreference = useSetAtom(localePreferenceAtom)

  return (
    <label className="locale-switcher">
      <span>{t("LocaleSwitcher.label")}</span>
      <select
        value={i18n.language}
        onChange={(event) => {
          const nextLocale = event.target.value as AppLocale
          setLocalePreference(nextLocale)
          router.replace(replaceLocaleInPath(pathname, nextLocale))
        }}
      >
        <option value="en">{t("LocaleSwitcher.english")}</option>
        <option value="km">{t("LocaleSwitcher.khmer")}</option>
      </select>
    </label>
  )
}
`

export const NEXT_I18N_CONFIG = `import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import en from "@/messages/en.json"
import km from "@/messages/km.json"

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    lng: "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    },
    resources: {
      en: {
        translation: en
      },
      km: {
        translation: km
      }
    }
  })
}

export default i18n
`

export const NEXT_LIB_NAVIGATION = `import type { AppLocale } from "@/types/navigation"

export function replaceLocaleInPath(pathname: string, nextLocale: AppLocale) {
  const segments = pathname.split("/").filter(Boolean)

  if (segments.length === 0) {
    return \`/\${nextLocale}\`
  }

  const [, ...rest] = segments
  return \`/\${nextLocale}\${rest.length > 0 ? \`/\${rest.join("/")}\` : ""}\`
}
`

export const NEXT_LIB_UTILS = `export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}
`

export const NEXT_APP_STORE = `import { atom } from "jotai"
import type { AdminWorkspace, AppLocale } from "@/types/navigation"

export const sidebarOpenAtom = atom(true)
export const localePreferenceAtom = atom<AppLocale>("en")
export const activeWorkspaceAtom = atom<AdminWorkspace>("overview")
`

export const NEXT_TYPES_NAVIGATION = `export const appLocales = ["en", "km"] as const

export type AppLocale = (typeof appLocales)[number]
export type AdminWorkspace = "overview" | "dashboard" | "settings"
`

export const NEXT_MESSAGES_EN = `{
  "Shell": {
    "brandKicker": "My App",
    "brandTitle": "Operations Console",
    "brandDescription": "Base scaffold for routing, translations, and global UI state in a Next.js admin app.",
    "navigationLabel": "Primary navigation",
    "collapse": "Collapse sidebar",
    "expand": "Expand sidebar",
    "links": {
      "overview": "Overview",
      "dashboard": "Dashboard",
      "settings": "Settings"
    }
  },
  "LocaleSwitcher": {
    "label": "Language",
    "english": "English",
    "khmer": "Khmer"
  },
  "HomePage": {
    "eyebrow": "Starter",
    "title": "Next.js base scaffold",
    "description": "This template starts with locale routing, translation loading, and shared Jotai atoms already connected.",
    "cards": {
      "routing": {
        "title": "Locale-aware routing",
        "description": "Every screen is mounted under a locale segment so navigation is ready for expansion."
      },
      "translation": {
        "title": "react-i18next setup",
        "description": "English and Khmer messages are loaded through a shared react-i18next configuration."
      },
      "state": {
        "title": "Global UI state",
        "description": "Sidebar and workspace state are centralized in lightweight Jotai atoms."
      }
    }
  },
  "DashboardPage": {
    "eyebrow": "Analytics",
    "title": "Dashboard workspace",
    "description": "Use this route as the first feature slice for metrics, charts, and operational summaries.",
    "metrics": {
      "revenue": {
        "label": "Revenue pipeline",
        "value": "$128,400"
      },
      "activeUsers": {
        "label": "Active users",
        "value": "8,241"
      },
      "conversion": {
        "label": "Conversion",
        "value": "14.2%"
      }
    }
  },
  "SettingsPage": {
    "eyebrow": "Configuration",
    "title": "Workspace settings",
    "description": "Language switching and shared workspace preferences already have their wiring in place.",
    "preferences": {
      "language": {
        "title": "Translation flow",
        "description": "The locale switcher updates both the route locale and the global preference atom."
      },
      "workspace": {
        "title": "Shared state",
        "description": "Expand the atom layer with auth, filters, or UI preferences as the admin surface grows."
      }
    }
  }
}
`

export const NEXT_MESSAGES_KM = `{
  "Shell": {
    "brandKicker": "My App",
    "brandTitle": "ផ្ទាំងគ្រប់គ្រងប្រតិបត្តិការ",
    "brandDescription": "គ្រោងមូលដ្ឋានសម្រាប់ routing, translation និង global UI state នៅក្នុង Next.js admin app។",
    "navigationLabel": "មឺនុយសំខាន់",
    "collapse": "បង្រួម sidebar",
    "expand": "ពង្រីក sidebar",
    "links": {
      "overview": "ទិដ្ឋភាពទូទៅ",
      "dashboard": "ផ្ទាំងគ្រប់គ្រង",
      "settings": "ការកំណត់"
    }
  },
  "LocaleSwitcher": {
    "label": "ភាសា",
    "english": "អង់គ្លេស",
    "khmer": "ខ្មែរ"
  },
  "HomePage": {
    "eyebrow": "មូលដ្ឋាន",
    "title": "គ្រោង Next.js",
    "description": "Template នេះមាន locale routing, translation loading និង Jotai atoms តភ្ជាប់រួចជាស្រេច។",
    "cards": {
      "routing": {
        "title": "Locale-aware routing",
        "description": "គ្រប់ screen ទាំងអស់ស្ថិតនៅក្រោម locale segment ដើម្បីងាយស្រួលពង្រីក។"
      },
      "translation": {
        "title": "react-i18next setup",
        "description": "សារ English និង Khmer ត្រូវបាន load តាម react-i18next configuration មួយ។"
      },
      "state": {
        "title": "Global UI state",
        "description": "Sidebar និង workspace state ត្រូវបានគ្រប់គ្រងដោយ Jotai atoms ស្រាលៗ។"
      }
    }
  },
  "DashboardPage": {
    "eyebrow": "វិភាគ",
    "title": "ផ្ទាំង Dashboard",
    "description": "ប្រើ route នេះសម្រាប់ metrics, charts និង operational summary របស់អ្នក។",
    "metrics": {
      "revenue": {
        "label": "បំពង់ចំណូល",
        "value": "$128,400"
      },
      "activeUsers": {
        "label": "អ្នកប្រើសកម្ម",
        "value": "8,241"
      },
      "conversion": {
        "label": "អត្រាបម្លែង",
        "value": "14.2%"
      }
    }
  },
  "SettingsPage": {
    "eyebrow": "ការកំណត់",
    "title": "ការកំណត់ workspace",
    "description": "Language switching និង shared workspace preferences ត្រូវបានរៀបចំរួចជាស្រេច។",
    "preferences": {
      "language": {
        "title": "Translation flow",
        "description": "Locale switcher ប្តូរ route locale និងរក្សាទុក global preference atom ពេលតែមួយ។"
      },
      "workspace": {
        "title": "Shared state",
        "description": "អ្នកអាចបន្ថែម auth, filters ឬ UI preferences ទៅក្នុង atom layer នេះបាន។"
      }
    }
  }
}
`
