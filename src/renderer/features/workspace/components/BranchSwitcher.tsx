import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { BodyText, MonoText } from "@renderer/shared/typography";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

/**
 * The current branch, and a menu to switch to another one.
 *
 * Replaces a stack of two boxes — an accent card repeating "Branch: main" and a
 * dashed card holding the repo path — with one row: branch name, chevron, and
 * the path as its hover title. Git refuses a checkout that would overwrite
 * local changes, and that refusal is surfaced verbatim rather than retried
 * with force.
 */

interface BranchSwitcherProps {
  projectPath: string;
  branch: string | null;
  branches: string[];
  repoRoot: string;
  disabled?: boolean;
  /** Which way the menu opens; "up" keeps it on screen for a row near the bottom. */
  placement?: "down" | "up";
  /** Reloads git status once the working tree has actually moved. */
  onSwitched: () => void;
}

export function BranchSwitcher({
  projectPath,
  branch,
  branches,
  repoRoot,
  disabled = false,
  placement = "down",
  onSwitched
}: Readonly<BranchSwitcherProps>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [switching, setSwitching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Click-away close. The menu is inline rather than portalled, so a listener
  // on the document is enough.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return;

      setOpen(false);
      setError(null);
    };

    globalThis.addEventListener("pointerdown", onPointerDown);
    return () => globalThis.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return branches;

    return branches.filter((name) => name.toLowerCase().includes(needle));
  }, [branches, query]);

  async function switchTo(target: string) {
    if (target === branch) {
      setOpen(false);
      return;
    }

    setSwitching(target);
    setError(null);

    try {
      const result = await globalThis.lazify.checkoutBranch(projectPath, target);

      if (result.success) {
        setOpen(false);
        setQuery("");
        onSwitched();
      } else {
        setError(result.message);
      }
    } finally {
      setSwitching(null);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setError(null);
          setOpen((current) => !current);
        }}
        title={repoRoot}
        className={clsx(
          "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
          "hover:bg-accent/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
        )}
      >
        <UiIcon name="activity" className="h-3.5 w-3.5 shrink-0 text-accent" />
        <MonoText as="span" className="min-w-0 flex-1 truncate text-sm text-text">
          {branch ?? t(translation.GitStatus.DetachedHead)}
        </MonoText>
        {switching ? (
          <UiIcon name="refresh-circle" className="h-3.5 w-3.5 shrink-0 animate-spin text-accent" />
        ) : (
          <UiIcon
            name="collapse"
            className={clsx("h-3 w-3 shrink-0 text-muted transition-transform", open && "rotate-180")}
          />
        )}
      </button>

      {open ? (
        <div
          className={clsx(
            "absolute left-0 right-0 z-30 overflow-hidden",
            placement === "up" ? "bottom-full mb-1" : "top-full mt-1",
            "rounded-lg border border-border bg-soft shadow-panel"
          )}
        >
          {branches.length > 8 ? (
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t(translation.GlobalTerm.Search)}
              className={clsx(
                "w-full border-b border-border bg-transparent px-3 py-2 text-xs text-text",
                "outline-none placeholder:text-muted"
              )}
            />
          ) : null}

          <div className="max-h-64 overflow-y-auto py-1">
            {matches.map((name) => {
              const current = name === branch;

              return (
                <button
                  key={name}
                  type="button"
                  disabled={switching !== null}
                  onClick={() => void switchTo(name)}
                  className={clsx(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors",
                    "disabled:cursor-not-allowed",
                    current ? "text-accent" : "text-text hover:bg-accent/[0.06]"
                  )}
                >
                  <UiIcon
                    name="check-circle"
                    className={clsx("h-3 w-3 shrink-0", current ? "opacity-100" : "opacity-0")}
                  />
                  <MonoText as="span" className="min-w-0 flex-1 truncate text-xs">
                    {name}
                  </MonoText>
                </button>
              );
            })}

            {matches.length === 0 ? (
              <BodyText className="px-3 py-3 text-center text-xs text-muted">
                {t(translation.GlobalTerm.NotAvailable)}
              </BodyText>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* git's own refusal — usually "local changes would be overwritten". It can
          list every dirty file, so it is capped and scrolls, and stays dismissible. */}
      {error ? (
        <div className="mt-1.5 flex items-start gap-1 px-2">
          <BodyText className="max-h-32 min-w-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words text-[11px] leading-5 text-error">
            {error}
          </BodyText>
          <Tooltip content={t(translation.GlobalTerm.Dismiss)} side="top">
            <button
              type="button"
              onClick={() => setError(null)}
              aria-label={t(translation.GlobalTerm.Dismiss)}
              className="shrink-0 rounded p-0.5 text-muted transition-colors hover:bg-accent/[0.06] hover:text-text"
            >
              <UiIcon name="xmark" className="h-3 w-3" />
            </button>
          </Tooltip>
        </div>
      ) : null}
    </div>
  );
}
