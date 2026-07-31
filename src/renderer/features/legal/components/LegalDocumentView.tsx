import { translation } from "@renderer/i18n/translation";
import {
  BodyText,
  CaptionText,
  OverlineText,
  PageTitle,
  SectionTitle,
} from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import type { LegalDocument } from "../content/types";

interface LegalDocumentViewProps {
  doc: LegalDocument;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Renders any {@link LegalDocument} as a readable article with a contents rail. */
export function LegalDocumentView({ doc }: Readonly<LegalDocumentViewProps>) {
  const { t } = useTranslation();
  const sections = doc.sections.map((section) => ({
    ...section,
    id: slugify(section.heading),
  }));

  function scrollToSection(id: string) {
    window.document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_13rem]">
      <article className="min-w-0">
        {/* Hero header */}
        <header className="rounded-[30px] border border-border bg-soft p-8 shadow-panel">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-bg text-accent">
              <UiIcon name={doc.icon} className="h-5 w-5" />
            </span>
            <OverlineText>{t(translation.Settings.Legal)}</OverlineText>
          </div>

          <PageTitle className="mt-5">{t(doc.titleKey)}</PageTitle>

          <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-bg px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <CaptionText as="span" tone="muted">
              Effective {doc.effectiveDate}
            </CaptionText>
          </span>

          <BodyText className="mt-5 max-w-2xl text-[15px] leading-7">
            {doc.summary}
          </BodyText>
        </header>

        {/* Body */}
        <div className="mt-6 rounded-[30px] border border-border bg-soft p-8 shadow-panel">
          {sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              className={clsx(
                "scroll-mt-4",
                index > 0 && "mt-8 border-t border-border pt-8",
              )}
            >
              <SectionTitle>{section.heading}</SectionTitle>
              <div className="mt-3 flex flex-col gap-3">
                {section.blocks.map((block, blockIndex) =>
                  block.kind === "paragraph" ? (
                    <BodyText
                      key={blockIndex}
                      tone="muted"
                      className="leading-7"
                    >
                      {block.text}
                    </BodyText>
                  ) : (
                    <ul
                      key={blockIndex}
                      className="ml-5 flex list-disc flex-col gap-2 marker:text-muted"
                    >
                      {block.items.map((item, itemIndex) => (
                        <li key={itemIndex}>
                          <BodyText
                            as="span"
                            tone="muted"
                            className="leading-7"
                          >
                            {item}
                          </BodyText>
                        </li>
                      ))}
                    </ul>
                  ),
                )}
              </div>
            </section>
          ))}
        </div>
      </article>

      {/* Contents rail */}
      <aside className="hidden lg:block">
        <nav className="sticky top-4 flex flex-col gap-0.5">
          <OverlineText className="px-3 pb-2">On this page</OverlineText>
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollToSection(section.id)}
              className="rounded-lg px-3 py-1.5 text-left text-sm text-muted transition-colors hover:bg-soft hover:text-text"
            >
              {section.heading}
            </button>
          ))}
        </nav>
      </aside>
    </div>
  );
}
