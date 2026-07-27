import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { MonoText, SmallText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface RunScriptPickerProps {
  /** Every runnable script for this project, name -> command. */
  scripts: Record<string, string>;
  /** The script currently wired to the run button, or null when none. */
  selected: string | null;
  /** Launches the selected script. */
  onRun: () => void;
  /** Rebinds the run button to a chosen script. */
  onSelect: (scriptName: string) => void;
}

const MENU_WIDTH = 256;

/**
 * The run button, plus a chevron menu to bind it to any package.json script.
 * Auto-detection only finds `dev`/`start`/`serve`, so a project that names its
 * dev script something else can point the button at it here.
 */
export function RunScriptPicker({
  scripts,
  selected,
  onRun,
  onSelect,
}: Readonly<RunScriptPickerProps>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  // Where to anchor the menu. The tab bar scrolls with overflow, which clips a
  // normally-positioned dropdown, so it is portalled to the body and pinned to
  // the toggle's on-screen rect instead.
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(
    null
  );
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const openMenu = () => {
    const rect = toggleRef.current?.getBoundingClientRect();
    if (rect) {
      setAnchor({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setOpen(true);
  };

  // Close on outside click, and on scroll/resize where the anchor would drift.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        toggleRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onReflow = () => setOpen(false);

    globalThis.addEventListener("pointerdown", onPointerDown);
    globalThis.addEventListener("resize", onReflow);
    globalThis.addEventListener("scroll", onReflow, true);
    return () => {
      globalThis.removeEventListener("pointerdown", onPointerDown);
      globalThis.removeEventListener("resize", onReflow);
      globalThis.removeEventListener("scroll", onReflow, true);
    };
  }, [open]);

  const names = Object.keys(scripts);

  return (
    <div className="relative flex shrink-0 items-center">
      <button
        type="button"
        onClick={onRun}
        disabled={!selected}
        className={clsx(
          "flex shrink-0 items-center gap-1.5 rounded-l-lg py-1.5 pl-3 pr-2 transition-colors",
          "text-accent hover:bg-text/[0.06] disabled:cursor-not-allowed disabled:text-muted disabled:opacity-60"
        )}
      >
        <UiIcon name="play" className="h-3.5 w-3.5" />
        <SmallText className={clsx(selected ? "!text-accent" : "!text-muted")}>
          {selected
            ? `${t(translation.Agents.Run)} ${selected}`
            : t(translation.Agents.RunPick)}
        </SmallText>
      </button>

      <button
        ref={toggleRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        title={t(translation.Agents.RunChoose)}
        aria-label={t(translation.Agents.RunChoose)}
        className={clsx(
          "flex shrink-0 items-center rounded-r-lg py-1.5 pl-1 pr-2 text-text transition-colors",
          "hover:bg-text/[0.06]"
        )}
      >
        <UiIcon
          name="collapse"
          className={clsx(
            "h-3 w-3 text-muted transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && anchor
        ? createPortal(
            <div
              ref={menuRef}
              style={{
                position: "fixed",
                top: anchor.top,
                right: anchor.right,
                width: MENU_WIDTH,
              }}
              className={clsx(
                "z-50 overflow-hidden",
                "rounded-lg border border-border bg-soft shadow-panel"
              )}
            >
              <SmallText
                as="div"
                className="!text-muted border-b border-border px-3 py-2"
              >
                {t(translation.Agents.RunChoose)}
              </SmallText>

              <div className="max-h-64 overflow-y-auto py-1">
                {names.map((name) => {
                  const current = name === selected;

                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        onSelect(name);
                        setOpen(false);
                      }}
                      className={clsx(
                        "flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors",
                        current
                          ? "text-accent"
                          : "text-text hover:bg-accent/[0.06]"
                      )}
                    >
                      <UiIcon
                        name="check-circle"
                        className={clsx(
                          "h-3 w-3 shrink-0",
                          current ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <MonoText
                          as="span"
                          className="block truncate text-xs font-semibold"
                        >
                          {name}
                        </MonoText>
                        <MonoText
                          as="span"
                          className="mt-0.5 block truncate text-[10px] text-muted"
                        >
                          {scripts[name]}
                        </MonoText>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
