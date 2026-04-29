import clsx from "clsx";
import UiIcon, { type UiIconName } from "./icons/UiIcon";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: UiIconName;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  icon,
}: PageHeaderProps) {
  return (
    <header
      className={clsx(
        "flex flex-wrap items-start justify-between gap-4",
        "border-b border-border pb-4",
        "text-text"
      )}
    >
      <div className="flex items-start gap-4">
        <div className="rounded-2xl border border-border bg-soft p-3 text-accent">
          <UiIcon name={icon} className="h-7 w-7" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">
            {eyebrow}
          </p>
          <h2 className="mt-2 font-display text-4xl leading-none text-text md:text-5xl">
            {title}
          </h2>
        </div>
      </div>
      <div className="max-w-xl text-sm leading-6 text-muted">{description}</div>
    </header>
  );
}
