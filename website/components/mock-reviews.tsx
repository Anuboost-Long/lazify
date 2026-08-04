import { Quote } from "lucide-react";

const reviews = [
  {
    quote: "It feels like the agent, terminal, preview, and diff finally belong to the same project.",
    name: "Maya Chen",
    role: "Product engineer",
  },
  {
    quote: "I can see what the agent changed and what the app looks like without rebuilding my workspace every time.",
    name: "Jon Bell",
    role: "Independent developer",
  },
  {
    quote: "The project rail makes parallel work feel organized instead of like a pile of terminal windows.",
    name: "Ari Morgan",
    role: "Frontend lead",
  },
  {
    quote: "Lazify keeps the local development loop visible. That is the part most agent tools leave fragmented.",
    name: "Sam Rivera",
    role: "Software founder",
  },
  {
    quote: "Being able to move from an agent response to the exact file and diff is the workflow I want every day.",
    name: "Noah Park",
    role: "Full-stack developer",
  },
];

function ReviewCard({
  review,
}: Readonly<{ review: (typeof reviews)[number] }>) {
  return (
    <article className="flex w-[min(82vw,390px)] shrink-0 flex-col rounded-2xl border border-white/10 bg-white/[.035] p-6 sm:p-7">
      <Quote size={20} strokeWidth={1.5} className="text-emerald-300" />
      <p className="mt-6 flex-1 text-base leading-7 text-stone-200">
        “{review.quote}”
      </p>
      <div className="mt-8 border-t border-white/10 pt-5">
        <p className="text-sm font-semibold text-white">{review.name}</p>
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[.12em] text-stone-500">
          {review.role} · Mock review
        </p>
      </div>
    </article>
  );
}

export function MockReviews() {
  return (
    <section aria-labelledby="mock-reviews-title" className="border-b border-white/[.08] bg-[#0b1411] py-28 lg:py-36">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-3xl">
            <p className="eyebrow">Placeholder testimonials</p>
            <h2 id="mock-reviews-title" className="mt-6 font-display text-5xl font-semibold leading-[1.02] tracking-[-.015em] text-[#f4f3ed] sm:text-6xl">
              Built for the way developers want to work.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-stone-500">
            Concept copy for layout testing. Replace these cards with verified customer feedback before launch.
          </p>
        </div>
      </div>

      <div className="review-viewport mt-14 overflow-hidden">
        <div className="review-track flex w-max gap-4 px-4 hover:[animation-play-state:paused]">
          {reviews.map((review) => <ReviewCard key={`primary-${review.name}`} review={review} />)}
          <div aria-hidden="true" className="contents">
            {reviews.map((review) => <ReviewCard key={`duplicate-${review.name}`} review={review} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
