import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { FAQ } from "@/lib/faq";

export default function FAQPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  return (
    <div className="commerce-page info-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="commerce-container faq-container">
        <span className="eyebrow" data-reveal>
          Ayuda
        </span>
        <h1 data-reveal>Preguntas frecuentes</h1>
        <div className="hp-home-faq" data-reveal-stagger>
          {FAQ.map(({ q, a }, i) => (
            <details key={q} className="faq-item" open={i === 0} data-reveal>
              <summary>
                {q}
                <ChevronDown size={18} aria-hidden="true" />
              </summary>
              <div className="faq-answer">
                <p>{a}</p>
              </div>
            </details>
          ))}
        </div>
        <Link href="/packs" className="btn btn-primary" style={{ marginTop: 32 }}>
          Ver los packs <ArrowRight size={17} />
        </Link>
      </div>
    </div>
  );
}
