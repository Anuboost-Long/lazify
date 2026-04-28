import { getTechIconName, type TechIconKey } from "@renderer/shared/lib/icon-map";
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
    <section className="rounded-shell border border-border bg-soft p-5 shadow-[0_0_8px_rgba(0,0,0,0.4)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
            Core Stack
          </p>
          <p className="mt-1 text-sm text-muted">
            The renderer and desktop shell now share a dedicated icon system.
          </p>
        </div>
        <div className="group flex items-center gap-2 rounded-full border border-border bg-bg px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          <UiIcon name="settings" className="h-4 w-4 text-muted group-hover:text-accent" />
          Icon Ready
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {primaryStack.map((item) => (
          <div
            key={item.key}
            className="flex items-center gap-3 rounded-[20px] border border-border bg-bg px-4 py-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-soft text-accent">
              <DevIcon
                name={getTechIconName(item.key)}
                className="text-2xl"
                title={item.label}
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-text">{item.label}</p>
              <p className="text-xs uppercase tracking-[0.22em] text-muted">
                {getTechIconName(item.key)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
