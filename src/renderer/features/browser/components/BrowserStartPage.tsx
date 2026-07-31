import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { CaptionText, PageTitle, SmallText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

/**
 * What a new tab shows before it is pointed anywhere.
 *
 * Native rather than a loaded homepage, which is the cheaper half of the point:
 * an empty tab costs nothing until the user asks for something, where pointing
 * it at a real start page would spin up a whole renderer to sit idle.
 */

interface Shortcut {
  label: string;
  url: string;
  icon: "media-video" | "code" | "chat-question" | "html";
}

const SHORTCUTS: Shortcut[] = [
  { label: "YouTube", url: "https://www.youtube.com", icon: "media-video" },
  { label: "GitHub", url: "https://github.com", icon: "code" },
  { label: "Stack Overflow", url: "https://stackoverflow.com", icon: "chat-question" },
  { label: "MDN", url: "https://developer.mozilla.org", icon: "html" }
];

interface BrowserStartPageProps {
  /** Takes raw input — a URL or a search phrase, resolved upstream. */
  onGo: (input: string) => void;
}

export function BrowserStartPage({ onGo }: Readonly<BrowserStartPageProps>) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-2">
        <span
          className={clsx(
            "flex h-12 w-12 items-center justify-center rounded-2xl",
            "border border-border bg-soft text-accent"
          )}
        >
          <UiIcon name="globe" className="h-6 w-6" />
        </span>
        <PageTitle className="text-center">{t(translation.Browser.StartTitle)}</PageTitle>
        <CaptionText tone="muted" className="text-center">
          {t(translation.Browser.StartHint)}
        </CaptionText>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (query.trim()) onGo(query);
        }}
        className="flex w-full max-w-xl items-center gap-2"
      >
        <div className="relative flex min-w-0 flex-1 items-center">
          <UiIcon
            name="search"
            className="pointer-events-none absolute left-3 h-4 w-4 text-muted"
          />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            spellCheck={false}
            placeholder={t(translation.Browser.AddressPlaceholder)}
            aria-label={t(translation.Browser.StartSearch)}
            className={clsx(
              "w-full rounded-2xl border border-border bg-soft py-3 pl-10 pr-4",
              "text-sm text-text outline-none",
              "placeholder:text-muted focus:border-accent"
            )}
          />
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {SHORTCUTS.map((shortcut) => (
          <button
            key={shortcut.url}
            type="button"
            onClick={() => onGo(shortcut.url)}
            className={clsx(
              "flex items-center gap-2 rounded-full border border-border bg-soft px-4 py-2",
              "transition-transform duration-200",
              "hover:-translate-y-0.5 hover:border-accent/50 active:scale-[0.98]"
            )}
          >
            <UiIcon name={shortcut.icon} className="h-3.5 w-3.5 text-accent" />
            <SmallText className="!text-text">{shortcut.label}</SmallText>
          </button>
        ))}
      </div>
    </div>
  );
}
