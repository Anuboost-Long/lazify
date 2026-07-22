import clsx from "clsx";
import { OverlineText, PageDescription, PageTitle } from "@renderer/shared/typography";
import { CardShapes } from "@renderer/shared/ui/card/CardShapes";
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
        "relative overflow-hidden rounded-[22px] border border-border",
        "bg-soft px-5 py-4 text-text"
      )}
    >
      {/* Subtle accent wash over the soft surface, matching the playful cards. */}
      <div className="pointer-events-none absolute inset-0 bg-accent-gradient-140" />

      {/* Accent hairline along the top edge. */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(to right, transparent, var(--color-accent), transparent)",
        }}
      />

      <CardShapes variant={2} />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={clsx(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px]",
              "border border-accent/25 bg-accent/10 text-accent ring-1 ring-accent/25",
              "shadow-accent-icon"
            )}
          >
            <UiIcon name={icon} className="h-6 w-6" />
          </div>
          <div>
            <OverlineText className="tracking-[0.28em]">
              {eyebrow}
            </OverlineText>
            <PageTitle className="mt-1 text-3xl leading-none md:text-4xl">
              {title}
            </PageTitle>
          </div>
        </div>
        <PageDescription className="max-w-xl leading-6">{description}</PageDescription>
      </div>
    </header>
  );
}
