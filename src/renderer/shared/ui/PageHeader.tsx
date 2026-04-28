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
    <header className="flex flex-wrap items-end justify-between gap-4 rounded-shell border border-border bg-soft px-6 py-5 shadow-[0_0_8px_rgba(0,0,0,0.4)] backdrop-blur">
      <div className="flex items-start gap-4">
        <div className="rounded-[24px] border border-border bg-bg p-3 text-accent">
          <UiIcon name={icon} className="h-7 w-7" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent">
            {eyebrow}
          </p>
          <h2 className="mt-2 font-display text-5xl leading-none text-text md:text-6xl">
            {title}
          </h2>
        </div>
      </div>
      <div className="max-w-xl text-sm leading-6 text-muted">{description}</div>
    </header>
  );
}
