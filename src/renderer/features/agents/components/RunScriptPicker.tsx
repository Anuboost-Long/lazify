import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { MonoText, SmallText } from "@renderer/shared/typography";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface RunScriptPickerProps {
  scripts: Record<string, string>;

  selected: string | null;

  onRun: () => void;

  onSelect: (scriptName: string) => void;
}

const MENU_WIDTH = 256;

export function RunScriptPicker({
  scripts,
  selected,
  onRun,
  onSelect,
}: Readonly<RunScriptPickerProps>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

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
    const onResize = () => setOpen(false);
    const onScroll = (event: Event) => {
      const target = event.target;

      if (target instanceof Node && menuRef.current?.contains(target)) return;

      setOpen(false);
    };

    globalThis.addEventListener("pointerdown", onPointerDown);
    globalThis.addEventListener("resize", onResize);
    globalThis.addEventListener("scroll", onScroll, true);
    return () => {
      globalThis.removeEventListener("pointerdown", onPointerDown);
      globalThis.removeEventListener("resize", onResize);
      globalThis.removeEventListener("scroll", onScroll, true);
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

      <Tooltip content={t(translation.Agents.RunChoose)} side="top">
        <button
          ref={toggleRef}
          type="button"
          onClick={() => (open ? setOpen(false) : openMenu())}
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
      </Tooltip>

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
