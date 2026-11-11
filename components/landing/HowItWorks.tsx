"use client";

import { motion, useReducedMotion } from "framer-motion";
import Icon from "@/components/ui/Icon";

const steps = [
  {
    n: "01",
    title: "Upload",
    icon: "upload_file",
    body: "Drag and drop PDFs, Word docs, or structured spreadsheets. DocBot OCRs and indexes every character with 99.9% accuracy.",
  },
  {
    n: "02",
    title: "Ask",
    icon: "chat_bubble",
    body: "Query your documents in plain English. From legal summaries to financial trend analysis, ask like you are talking to an expert.",
  },
  {
    n: "03",
    title: "Get answers",
    icon: "fact_check",
    body: "Receive cited answers with direct links to source pages. Export summaries or chat history for your reports instantly.",
  },
];

export default function HowItWorks() {
  const reduce = useReducedMotion();

  return (
    <section id="how" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
      <div className="mb-12 max-w-2xl space-y-3 md:mb-14">
        <h2 className="text-2xl font-bold tracking-tight text-[color:var(--color-ink)] md:text-3xl">
          Three steps to a cited answer
        </h2>
        <p className="text-[15px] leading-relaxed text-[color:var(--color-ink-2)] md:text-base">
          Upload once, ask in plain language, and keep every answer tied to its
          source.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
        {steps.map((s, i) => (
          <motion.div
            key={s.n}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{
              delay: reduce ? 0 : i * 0.06,
              duration: 0.45,
              ease: [0.32, 0.72, 0, 1],
            }}
            className="border border-[color:var(--color-rule)] bg-[color:var(--color-paper-2)] p-7 md:p-8"
            style={{ borderRadius: "var(--radius-card)" }}
          >
            <div
              className="mb-5 flex h-11 w-11 items-center justify-center bg-[color:var(--color-accent-soft)] text-[color:var(--color-focus)]"
              style={{ borderRadius: "10px" }}
            >
              <Icon name={s.icon} className="text-[24px]" />
            </div>
            <p className="hm-label mb-2">{s.n}</p>
            <h3 className="mb-3 text-lg font-semibold text-[color:var(--color-ink)]">
              {s.title}
            </h3>
            <p className="text-[15px] leading-relaxed text-[color:var(--color-ink-2)]">
              {s.body}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
