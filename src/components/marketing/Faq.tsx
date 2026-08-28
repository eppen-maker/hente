import { Plus } from "lucide-react";

import { Reveal } from "@/components/ui/Reveal";

export interface FaqItem {
  question: string;
  answer: string;
}

/** Native disclosure list — no JavaScript needed, fully keyboard accessible. */
export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((item, index) => (
        <Reveal key={item.question} delay={index * 50}>
          <details className="group py-6">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-left [&::-webkit-details-marker]:hidden">
              <h3 className="font-display text-lg leading-snug text-ink sm:text-xl">
                {item.question}
              </h3>
              <Plus
                className="mt-1 size-4 shrink-0 text-ink-muted transition-transform duration-300 group-open:rotate-45"
                strokeWidth={1.5}
              />
            </summary>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">
              {item.answer}
            </p>
          </details>
        </Reveal>
      ))}
    </div>
  );
}
