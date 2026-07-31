import clsx from "clsx";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { SmallText } from "@renderer/shared/typography";
import { CodeSurface } from "@renderer/shared/ui/code/CodeSurface";
import { getAssetDirectory, reloadHighlighter } from "@renderer/shared/ui/code/highlighter/registry";
import { useCodeTheme } from "@renderer/shared/ui/code/highlighter/use-highlighter";
import type { ThemeOption } from "@renderer/shared/ui/code/highlighter/types";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

import { SectionLabel } from "./SectionLabel";
import { SettingRow } from "./SettingRow";

/** Short enough to fit the preview box, wide enough to exercise a theme. */
const PREVIEW = `import { readFile } from "node:fs/promises";

/** Loads a manifest and falls back to an empty one. */
export async function loadManifest(path: string): Promise<Manifest> {
  try {
    const raw = await readFile(path, "utf8");
    return { ...EMPTY, ...JSON.parse(raw) } as Manifest;
  } catch (error) {
    console.warn(\`skipping \${path}\`, error);
    return EMPTY;
  }
}`;

const SELECT_CLASS =
  "w-56 rounded-[10px] border border-border bg-bg px-3 py-1.5 text-xs font-semibold text-text outline-none focus:border-accent";

function ThemeSelect({
  value,
  options,
  onChange
}: Readonly<{ value: string; options: ThemeOption[]; onChange: (id: string) => void }>) {
  // Grouped so a user's own drop-ins are never buried under 60 bundled themes.
  const groups = useMemo(
    () => ({
      user: options.filter((option) => option.source === "user"),
      dark: options.filter((option) => option.source === "bundled" && option.type === "dark"),
      light: options.filter((option) => option.source === "bundled" && option.type === "light")
    }),
    [options]
  );

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={SELECT_CLASS}
    >
      {groups.user.length > 0 && (
        <optgroup label="Yours">
          {groups.user.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </optgroup>
      )}
      <optgroup label="Dark">
        {groups.dark.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </optgroup>
      <optgroup label="Light">
        {groups.light.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </optgroup>
    </select>
  );
}

/**
 * Picks the TextMate theme used by every code pane, one per app appearance,
 * and points at the folder where extra themes and grammars can be dropped.
 */
export function CodeThemeSection() {
  const { t } = useTranslation();
  const { choice, options, setCodeTheme } = useCodeTheme();
  const [reloading, setReloading] = useState(false);

  const directory = getAssetDirectory();
  const userCount = options.filter((option) => option.source === "user").length;

  async function handleReload() {
    setReloading(true);
    try {
      await reloadHighlighter();
    } finally {
      setReloading(false);
    }
  }

  return (
    <div className="border-t border-border pt-6">
      <SectionLabel>{t(translation.Settings.CodeTheme)}</SectionLabel>

      <div className={clsx("rounded-2xl border border-border bg-soft p-5", "divide-y divide-border")}>
        <SettingRow
          label={t(translation.Settings.CodeThemeDark)}
          description={t(translation.Settings.CodeThemeDesc)}
        >
          <ThemeSelect
            value={choice.dark}
            options={options}
            onChange={(id) => setCodeTheme("dark", id)}
          />
        </SettingRow>

        <SettingRow label={t(translation.Settings.CodeThemeLight)}>
          <ThemeSelect
            value={choice.light}
            options={options}
            onChange={(id) => setCodeTheme("light", id)}
          />
        </SettingRow>

        <SettingRow
          label={t(translation.Settings.CodeThemeFolder)}
          description={t(translation.Settings.CodeThemeFolderDesc)}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void globalThis.lazify.openHighlightingFolder()}
              className="flex items-center gap-1.5 rounded-[10px] border border-border bg-bg px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:border-accent hover:text-accent"
            >
              <UiIcon name="folder" className="h-3.5 w-3.5" />
              {t(translation.GlobalTerm.Open)}
            </button>
            <button
              type="button"
              onClick={() => void handleReload()}
              disabled={reloading}
              className="flex items-center gap-1.5 rounded-[10px] border border-border bg-bg px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
            >
              <UiIcon name="refresh-circle" className="h-3.5 w-3.5" />
              {t(translation.GlobalTerm.Refresh)}
            </button>
          </div>
        </SettingRow>

        <div className="pt-4">
          <SmallText className="mb-2 block truncate" title={directory}>
            {directory || t(translation.Settings.CodeThemeFolderDesc)}
            {userCount > 0 ? ` — ${userCount}` : ""}
          </SmallText>

          <div className="h-56 overflow-hidden rounded-[14px] border border-border">
            <CodeSurface variant="flush" content={PREVIEW} fileName="preview.ts" />
          </div>
        </div>
      </div>
    </div>
  );
}
