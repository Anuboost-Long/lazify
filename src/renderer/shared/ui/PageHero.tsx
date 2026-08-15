import clsx from "clsx";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { BodyText, OverlineText, SectionTitle } from "@renderer/shared/typography";

interface PageHeroProps {
  /** Translation keys — the hero calls t() itself. */
  title: string;
  description: string;
  /** The small line above the title, where a page has one. */
  eyebrow?: string;
  /** Anything the page wants on the right — an action, a filter. */
  children?: ReactNode;
}

/**
 * The band a page opens with.
 *
 * The templates page wore this first; it lives here so every page that opens
 * with a heading opens with the same one. Deliberately plain — a rule down the
 * leading edge, the heading and its sentence, and room for one action. Figures
 * and counts belong in the page below, where there is space to read them.
 */
export function PageHero({ title, description, eyebrow, children }: Readonly<PageHeroProps>) {
  const { t } = useTranslation();

  return (
    <section
      className={clsx(
        "relative overflow-hidden rounded-[30px] border border-border bg-soft",
        "px-6 py-6 shadow-panel lg:px-8"
      )}
    >
      <div className="absolute inset-y-0 left-0 w-1 bg-accent" />
      <div className="absolute -right-16 -top-24 h-56 w-56 rotate-12 rounded-[64px] border border-accent/15 bg-[linear-gradient(145deg,transparent,var(--color-accent-soft))]" />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <OverlineText className="tracking-[0.24em]">{t(eyebrow)}</OverlineText>
          ) : null}

          <SectionTitle className={clsx("text-3xl", eyebrow && "mt-2")}>{t(title)}</SectionTitle>

          <BodyText tone="muted" className="mt-3 max-w-2xl leading-6">
            {t(description)}
          </BodyText>
        </div>

        {children}
      </div>
    </section>
  );
}
