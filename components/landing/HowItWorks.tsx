"use client";

import { motion } from "framer-motion";
import Icon from "@/components/ui/Icon";

const steps = [
  {
    n: "01",
    title: "Upload",
    icon: "upload_file",
    tone: "bg-primary-fixed text-primary",
    body: "Drag and drop PDFs, Word docs, or structured spreadsheets. DocBot instantly OCRs and indexes every character with 99.9% accuracy.",
  },
  {
    n: "02",
    title: "Ask",
    icon: "chat_bubble",
    tone: "bg-secondary-fixed text-secondary",
    body: "Query your documents in plain English. From legal summaries to financial trend analysis, just ask like you're talking to an expert.",
  },
  {
    n: "03",
    title: "Get Answers",
    icon: "fact_check",
    tone: "bg-surface-container-highest text-on-surface",
    body: "Receive cited answers with direct links to source pages. Export summaries or chat history for your reports instantly.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-7xl px-gutter py-20 md:py-28">
      <div className="mb-16 space-y-4 text-center">
        <h2 className="text-headline-lg text-on-surface md:text-3xl md:font-semibold">
          Precision in Three Simple Steps
        </h2>
        <p className="mx-auto max-w-xl text-body-md text-on-surface-variant">
          Our intelligence pipeline is designed to eliminate cognitive load and
          maximize throughput.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {steps.map((s, i) => (
          <motion.div
            key={s.n}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{
              delay: i * 0.08,
              duration: 0.65,
              ease: [0.32, 0.72, 0, 1],
            }}
            className="group rounded-2xl border border-outline-variant bg-surface p-8 transition-all duration-300 hover:border-primary hover:shadow-lift"
          >
            <div
              className={`mb-6 flex h-14 w-14 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${s.tone}`}
            >
              <Icon name={s.icon} className="text-3xl" />
            </div>
            <h3 className="mb-4 text-headline-lg text-on-surface">
              {s.n}. {s.title}
            </h3>
            <p className="text-body-md text-on-surface-variant">{s.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
