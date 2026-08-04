import { AlertTriangle, ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { BrandIcon } from "./brand-icon";
import type { LegalDocument } from "@/lib/legal-documents";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function LegalDocumentPage({
  document,
}: Readonly<{ document: LegalDocument }>) {
  const sections = document.sections.map((section) => ({
    ...section,
    id: slugify(section.heading),
  }));

  return (
    <main className="min-h-screen bg-[#08100e] px-5 pb-20 pt-6 text-stone-100 sm:px-8">
      <header className="mx-auto flex max-w-6xl items-center justify-between border-b border-white/10 pb-6">
        <Link href="/" className="flex items-center gap-2.5 text-sm font-semibold text-white">
          <BrandIcon size={30} className="rounded-lg" /> Lazify
        </Link>
        <nav aria-label="Legal navigation" className="flex items-center gap-5 text-xs text-stone-400">
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
          <Link href="/terms" className="hover:text-white">Terms</Link>
        </nav>
      </header>

      <div className="mx-auto mt-10 max-w-6xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-stone-400 transition-colors hover:text-white">
          <ArrowLeft size={15} /> Back to Lazify
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_230px]">
          <article className="min-w-0">
            <header className="rounded-[26px] border border-white/10 bg-[#0c1813] p-7 sm:p-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/[.07] text-emerald-300">
                <FileText size={21} />
              </div>
              <p className="eyebrow mt-7">Legal</p>
              <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-white sm:text-6xl">
                {document.title}
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-stone-300">{document.summary}</p>
              <p className="mt-6 font-mono text-[10px] uppercase tracking-[.13em] text-stone-500">
                Effective {document.effectiveDate}
              </p>
            </header>

            <aside className="mt-5 flex gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/[.06] p-5 text-amber-100">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-300" />
              <div>
                <p className="text-sm font-semibold">Draft legal template</p>
                <p className="mt-1 text-sm leading-6 text-amber-100/70">
                  Bracketed placeholders must be completed and this document should be reviewed by qualified legal counsel before publication.
                </p>
              </div>
            </aside>

            <div className="mt-5 rounded-[26px] border border-white/10 bg-white/[.025] px-6 py-2 sm:px-10">
              {sections.map((section, index) => (
                <section
                  key={section.id}
                  id={section.id}
                  className={index === 0 ? "scroll-mt-8 py-8" : "scroll-mt-8 border-t border-white/10 py-8"}
                >
                  <h2 className="font-display text-2xl font-semibold text-white">{section.heading}</h2>
                  <div className="mt-4 space-y-4">
                    {section.blocks.map((block, blockIndex) =>
                      block.kind === "paragraph" ? (
                        <p key={blockIndex} className="text-[15px] leading-8 text-stone-300">{block.text}</p>
                      ) : (
                        <ul key={blockIndex} className="ml-5 list-disc space-y-3 marker:text-emerald-300">
                          {block.items.map((item) => <li key={item} className="pl-1 text-[15px] leading-8 text-stone-300">{item}</li>)}
                        </ul>
                      ),
                    )}
                  </div>
                </section>
              ))}
            </div>
          </article>

          <aside className="hidden lg:block">
            <nav aria-label="On this page" className="sticky top-8">
              <p className="font-mono text-[9px] uppercase tracking-[.16em] text-stone-600">On this page</p>
              <div className="mt-4 space-y-1 border-l border-white/10 pl-4">
                {sections.map((section) => (
                  <a key={section.id} href={`#${section.id}`} className="block py-1.5 text-xs leading-5 text-stone-500 transition-colors hover:text-white">
                    {section.heading}
                  </a>
                ))}
              </div>
            </nav>
          </aside>
        </div>
      </div>
    </main>
  );
}
