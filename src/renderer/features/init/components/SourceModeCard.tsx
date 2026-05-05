import clsx from "clsx";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface SourceModeCardProps {
  active: boolean;
  icon: "play" | "import";
  eyebrow: string;
  title: string;
  description: string;
  metadata: string;
  onClick: () => void;
}

export function SourceModeCard({
  active,
  icon,
  eyebrow,
  title,
  description,
  metadata,
  onClick
}: SourceModeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "group relative overflow-hidden rounded-[28px] border p-6 text-left transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1",
        active
          ? "border-accent bg-[linear-gradient(135deg,rgba(16,185,129,0.1),rgba(255,255,255,0.02))] shadow-glow"
          : "border-border bg-soft hover:border-accent"
      )}
    >
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: "linear-gradient(to right, transparent, var(--color-accent), transparent)"
        }}
      />

      <div className="flex items-start justify-between gap-4">
        <div
          className={clsx(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border transition-[transform,box-shadow] duration-300",
            active
              ? "border-accent/25 bg-accent/10 text-accent shadow-[0_18px_40px_rgba(16,185,129,0.2)]"
              : "border-border bg-bg text-muted group-hover:border-accent/20 group-hover:text-accent"
          )}
        >
          <UiIcon name={icon} className="h-7 w-7" />
        </div>

        <span
          className={clsx(
            "rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]",
            active
              ? "border-accent/20 bg-accent/10 text-accent"
              : "border-border bg-bg text-muted"
          )}
        >
          {active ? "Active mode" : "Click to choose"}
        </span>
      </div>

      <div className="mt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
          {eyebrow}
        </p>
        <p className="mt-2 text-xl font-semibold text-text">{title}</p>
        <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 rounded-[20px] border border-border/80 bg-bg/75 px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
            Flow
          </p>
          <p className="mt-1 text-sm text-text">{metadata}</p>
        </div>
        <UiIcon
          name="arrow-right"
          className={clsx(
            "h-5 w-5 shrink-0 transition-transform duration-200",
            active ? "text-accent" : "text-muted group-hover:translate-x-1 group-hover:text-accent"
          )}
        />
      </div>
    </button>
  );
}
