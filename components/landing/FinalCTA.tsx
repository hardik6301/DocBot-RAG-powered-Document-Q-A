"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function FinalCTA() {
  return (
    <section className="relative px-gutter py-24 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
        className="glass-card relative mx-auto max-w-4xl space-y-8 overflow-hidden rounded-[40px] border border-primary/20 p-10 md:p-16"
      >
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary opacity-5 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-secondary opacity-5 blur-3xl" />
        <h2 className="relative z-10 text-headline-xl text-on-surface md:text-4xl md:font-bold">
          Ready to unlock your documents?
        </h2>
        <p className="relative z-10 text-body-md text-on-surface-variant">
          Join researchers, lawyers, and analysts using DocBot to work smarter.
        </p>
        <div className="relative z-10 flex justify-center">
          <Link
            href="/auth/login"
            className="rounded-2xl bg-primary px-12 py-5 text-xl font-bold text-on-primary transition-all hover:-translate-y-1 hover:shadow-2xl active:scale-95"
          >
            Start for Free
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
