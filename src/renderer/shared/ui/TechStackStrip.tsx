import clsx from "clsx";
import { getTechIconName, type TechIconKey } from "@renderer/shared/lib/icon-map";
import { BodyText, CardTitle, OverlineText, PillText } from "@renderer/shared/typography";
import DevIcon from "./icons/DevIcon";
import UiIcon from "./icons/UiIcon";

const primaryStack: Array<{ key: TechIconKey; label: string }> = [
  { key: "electron", label: "Electron" },
  { key: "react", label: "React" },
  { key: "typescript", label: "TypeScript" },
  { key: "node", label: "Node.js" },
  { key: "vite", label: "Vite" },
  { key: "tailwind", label: "Tailwind" }
];

export function TechStackStrip() {
  return (
    <section
      className={clsx(
        "rounded-shell border border-border bg-soft p-5",
        "shadow-panel"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <OverlineText className="text-accent">
            Core Stack
          </OverlineText>
          <BodyText className="mt-1 text-muted">
            The renderer and desktop shell now share a dedicated icon system.
          </BodyText>
        </div>
        <div
          className={clsx(
            "group flex items-center gap-2",
            "rounded-full border border-border bg-bg px-3 py-2",
            "text-xs font-semibold uppercase tracking-[0.2em] text-muted"
          )}
        >
          <UiIcon name="settings" className="h-4 w-4 text-muted group-hover:text-accent" />
          Icon Ready
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {primaryStack.map((item) => (
          <div
            key={item.key}
            className={clsx(
              "flex items-center gap-3",
              "rounded-[20px] border border-border bg-bg px-4 py-3"
            )}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-soft text-accent">
              <DevIcon
                name={getTechIconName(item.key)}
                className="text-2xl"
                title={item.label}
              />
            </div>
            <div>
              <CardTitle className="text-sm">{item.label}</CardTitle>
              <PillText className="text-muted">
                {getTechIconName(item.key)}
              </PillText>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
