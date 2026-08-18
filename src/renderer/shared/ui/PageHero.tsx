import clsx from "clsx";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { BodyText, OverlineText, SectionTitle } from "@renderer/shared/typography";
import { CardShapes } from "@renderer/shared/ui/card/CardShapes";

interface PageHeroProps {
  /** Translation keys — the hero calls t() itself. */
  title: string;
  description: string;
  /** The small line above the title, where a page has one. */
  eyebrow?: string;
  /** Anything the page wants on the right — an action, a filter. */
  children?: ReactNode;
}

export function PageHero({ title, description, eyebrow, children }: Readonly<PageHeroProps>) {
  const { t } = useTranslation();

  return (
    <section
      className={clsx(
        "relative overflow-hidden rounded-[24px] border border-border bg-soft",
        "px-6 py-7 shadow-panel lg:px-8"
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(circle at 10% 0%, rgb(var(--color-accent) / 0.15), transparent 34%), linear-gradient(120deg, transparent 55%, rgb(var(--color-text) / 0.025))"
        }}
      />
      <CardShapes variant={2} className="text-accent/25 !opacity-100 dark:text-accent/30" />

      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <OverlineText>{t(eyebrow)}</OverlineText>
          ) : null}

          <SectionTitle className={clsx("!text-3xl lg:!text-4xl", eyebrow && "mt-3")}>
            {t(title)}
          </SectionTitle>

          <BodyText tone="muted" className="mt-3 max-w-xl leading-6">
            {t(description)}
          </BodyText>
        </div>

        {children ? <div className="min-w-0 flex-1 lg:max-w-3xl">{children}</div> : null}
      </div>
    </section>
  );
}
