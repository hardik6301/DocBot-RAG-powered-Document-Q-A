"use client";

import { motion, useReducedMotion } from "framer-motion";
import Icon from "@/components/ui/Icon";

const steps = [
  {
    n: "01",
    title: "Upload",
    icon: "upload_file",
    tone: "bg-[#EFF6FF] text-[#1D4ED8]",
    body: "Drag and drop PDFs, Word docs, or structured spreadsheets. DocBot instantly OCRs and indexes every character with 99.9% accuracy.",
  },
  {
    n: "02",
    title: "Ask",
    icon: "chat_bubble",
    tone: "bg-[#EEF2FF] text-[#4338CA]",
    body: "Query your documents in plain English. From legal summaries to financial trend analysis, just ask like you're talking to an expert.",
  },
  {
    n: "03",
    title: "Get Answers",
    icon: "fact_check",
    tone: "bg-[#F1F5F9] text-[#0F172A]",
    body: "Receive cited answers with direct links to source pages. Export summaries or chat history for your reports instantly.",
  },
];

export default function HowItWorks() {
  const reduce = useReducedMotion();

  return (
    <section id="how" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
      <div className="mb-14 space-y-3 text-center md:mb-16">
        <h2 className="text-2xl font-bold tracking-tight text-[#0F172A] md:text-3xl">
          Precision in Three Simple Steps
        </h2>
        <p className="mx-auto max-w-xl text-[15px] leading-relaxed text-[#64748B] md:text-base">
          Our intelligence pipeline is designed to eliminate cognitive load and
          maximize throughput.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
        {steps.map((s, i) => (
          <motion.div
            key={s.n}
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{
              delay: i * 0.08,
              duration: 0.55,
              ease: [0.32, 0.72, 0, 1],
            }}
            className="group cursor-default rounded-2xl border border-[#E2E8F0] bg-white p-7 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.18)] transition-colors duration-200 hover:border-[#93C5FD] hover:bg-[#FAFCFF] md:p-8"
          >
            <div
              className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${s.tone}`}
            >
              <Icon name={s.icon} className="text-[26px]" />
            </div>
            <h3 className="mb-3 text-lg font-semibold text-[#0F172A]">
              {s.n}. {s.title}
            </h3>
            <p className="text-[15px] leading-relaxed text-[#64748B]">{s.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
