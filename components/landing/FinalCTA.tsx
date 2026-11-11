"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

export default function FinalCTA() {
  const reduce = useReducedMotion();

  return (
    <section className="px-4 py-20 text-left sm:px-6 md:py-24">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        className="mx-auto flex max-w-6xl flex-col gap-6 border border-[color:var(--color-rule)] bg-[color:var(--color-paper-3)] p-8 md:flex-row md:items-end md:justify-between md:p-12"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <div className="max-w-xl space-y-3">
          <h2 className="text-2xl font-bold tracking-tight text-[color:var(--color-ink)] md:text-3xl">
            Ready to ask your documents?
          </h2>
          <p className="text-[15px] leading-relaxed text-[color:var(--color-ink-2)] md:text-base">
            Join researchers, lawyers, and analysts using DocBot to work smarter.
          </p>
        </div>
        <Link href="/auth/login" className="btn-primary shrink-0">
          Start for Free
        </Link>
      </motion.div>
    </section>
  );
}
