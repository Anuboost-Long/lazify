import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { BodyText } from "@renderer/shared/typography";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

/**
 * Commit message and the commit/push actions, as the source control view
 * lays them out: the message on top, then one primary button.
 *
 * Committing with nothing staged is refused up front rather than letting git
 * fail, because "nothing to commit" is a question about the UI's state, not an
 * error worth surfacing. Push is a separate, deliberate press — nothing here
 * ever reaches the remote on its own.
 */

interface CommitBoxProps {
  projectPath: string;
  /** Named in the placeholder so the target of the commit is never a guess. */
  branch: string | null;
  stagedCount: number;
  disabled?: boolean;
  /** Reloads git status after the repository changes. */
  onChanged: () => void;
}

export function CommitBox({
  projectPath,
  branch,
  stagedCount,
  disabled = false,
  onChanged
}: Readonly<CommitBoxProps>) {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"commit" | "push" | "pull" | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The split button's secondary actions, closed until the chevron is pressed.
  const [menuOpen, setMenuOpen] = useState(false);

  const canCommit = stagedCount > 0 && message.trim().length > 0 && !disabled && !busy;

  async function commit() {
    if (!canCommit) return;

    setBusy("commit");
    setError(null);

    try {
      const result = await globalThis.lazify.commitChanges(projectPath, message);

      if (result.success) {
        setMessage("");
        onChanged();
      } else {
        setError(result.message);
      }
    } finally {
      setBusy(null);
    }
  }

  async function push() {
    setMenuOpen(false);
    setBusy("push");
    setError(null);

    try {
      const result = await globalThis.lazify.pushBranch(projectPath);

      if (result.success) onChanged();
      else setError(result.message);
    } finally {
      setBusy(null);
    }
  }

  async function pull() {
    setMenuOpen(false);
    setBusy("pull");
    setError(null);

    try {
      const result = await globalThis.lazify.pullBranch(projectPath);

      if (result.success) onChanged();
      else setError(result.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-1.5 px-2">
      <textarea
        rows={1}
        value={message}
        disabled={disabled}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={(event) => {
          // ⌘/Ctrl+Enter commits, matching the editor everyone came from.
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            void commit();
          }
        }}
        placeholder={
          branch
            ? t(translation.GitStatus.CommitPlaceholderOn, { branch })
            : t(translation.GitStatus.CommitPlaceholder)
        }
        className={clsx(
          "w-full resize-none truncate rounded-md border border-border bg-bg px-2.5 py-2",
          "text-xs leading-5 text-text outline-none transition-colors",
          "placeholder:text-muted focus:border-accent disabled:opacity-60"
        )}
      />

      {/* One primary button with the extra actions folded behind its chevron,
          the way source control views present commit. */}
      <div className="flex items-stretch">
        <Tooltip content={t(translation.GitStatus.Commit)} side="top">
          <button
            type="button"
            onClick={() => void commit()}
            disabled={!canCommit}
            className={clsx(
              "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-l-md px-3 py-2",
              "bg-accent text-xs font-semibold text-white transition-colors hover:bg-accentHover",
              "disabled:cursor-not-allowed disabled:opacity-40"
            )}
          >
            <UiIcon
              name={busy === "commit" ? "refresh-circle" : "check-circle"}
              className={clsx("h-3.5 w-3.5", busy === "commit" && "animate-spin")}
            />
            <span className="truncate">
              {t(translation.GitStatus.Commit)}
              {stagedCount > 0 ? ` (${stagedCount})` : ""}
            </span>
          </button>
        </Tooltip>

        {/* The chevron is the menu's anchor, so the popup hangs from the
            button that opened it rather than from the whole button row. */}
        <div className="relative flex shrink-0">
          <Tooltip content={t(translation.GitStatus.CommitOptions)} side="top">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              disabled={disabled || busy !== null}
              aria-expanded={menuOpen}
              aria-label={t(translation.GitStatus.CommitOptions)}
              className={clsx(
                "flex w-7 shrink-0 items-center justify-center rounded-r-md border-l border-white/25",
                "bg-accent text-white transition-colors hover:bg-accentHover",
                "disabled:cursor-not-allowed disabled:opacity-40"
              )}
            >
              <span className="text-[10px] leading-none">▾</span>
            </button>
          </Tooltip>

          {menuOpen ? (
            <div
              className={clsx(
                "absolute right-0 top-full z-20 mt-1 min-w-32 overflow-hidden rounded-md",
                "border border-border bg-bg shadow-panel"
              )}
            >
              <button
                type="button"
                onClick={() => void push()}
                className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs text-text transition-colors hover:bg-accent/10"
              >
                <UiIcon
                  name={busy === "push" ? "refresh-circle" : "arrow-right"}
                  className={clsx("h-3.5 w-3.5", busy === "push" && "animate-spin")}
                />
                {t(translation.GitStatus.Push)}
              </button>

              <button
                type="button"
                onClick={() => void pull()}
                className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs text-text transition-colors hover:bg-accent/10"
              >
                <UiIcon
                  name={busy === "pull" ? "refresh-circle" : "download"}
                  className={clsx("h-3.5 w-3.5", busy === "pull" && "animate-spin")}
                />
                {t(translation.GitStatus.Pull)}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* git's own words — "nothing to commit", "rejected", auth failures. */}
      {error ? (
        <BodyText className="whitespace-pre-wrap break-words text-[11px] leading-5 text-error">
          {error}
        </BodyText>
      ) : null}
    </div>
  );
}
