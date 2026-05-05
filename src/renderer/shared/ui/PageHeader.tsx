import clsx from "clsx";
import { OverlineText, PageDescription, PageTitle } from "@renderer/shared/typography";
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
          <OverlineText tone="muted" className="tracking-[0.28em]">
            {eyebrow}
          </OverlineText>
          <PageTitle className="mt-2 leading-none">
            {title}
          </PageTitle>
        </div>
      </div>
      <PageDescription className="max-w-xl leading-6">{description}</PageDescription>
    </header>
  );
}
