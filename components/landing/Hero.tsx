"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import Icon from "@/components/ui/Icon";

const ease = [0.32, 0.72, 0, 1] as const;

export default function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-x-clip px-4 pb-16 pt-28 sm:px-6 md:pb-24 md:pt-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 50% 40% at 12% 20%, color-mix(in oklab, var(--color-accent-soft) 70%, transparent) 0%, transparent 70%),
            radial-gradient(ellipse 45% 36% at 88% 18%, color-mix(in oklab, var(--color-paper-3) 80%, transparent) 0%, transparent 68%),
            linear-gradient(180deg, var(--color-paper) 0%, var(--color-paper-2) 100%)
          `,
        }}
      />

      <div className="relative z-10 mx-auto grid w-full max-w-[1120px] items-center gap-10 md:grid-cols-12 md:gap-12 lg:min-h-[calc(100dvh-7rem)]">
        <div className="flex flex-col items-start gap-5 text-left md:col-span-5 md:gap-6">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease }}
            className="font-display text-[1.75rem] font-bold leading-none tracking-tight text-[color:var(--color-focus)] md:text-[2rem]"
          >
            DocBot
          </motion.p>

          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.04, ease }}
            className="max-w-[16ch] text-[2.2rem] font-bold leading-[1.08] tracking-[-0.03em] text-[color:var(--color-ink)] sm:text-5xl md:text-[3.25rem]"
          >
            Upload. Ask. Get cited answers.
          </motion.h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08, ease }}
            className="lead max-w-[34rem] text-[15px] leading-relaxed text-[color:var(--color-ink-2)] md:text-lg"
          >
            Extract insights from PDFs, spreadsheets, and legal papers with
            answers that point back to the source page.
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12, ease }}
            className="flex w-full flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Link href="/auth/login" className="btn-primary w-full sm:w-auto">
              Get Started Free
            </Link>
            <a href="#how" className="btn-quiet w-full sm:w-auto">
              <Icon name="play_circle" className="text-[20px] text-[color:var(--color-accent)]" />
              See how it works
            </a>
          </motion.div>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.14, ease }}
          className="md:col-span-7"
          aria-label="Product preview"
        >
          <div
            className="overflow-hidden border border-[color:var(--color-rule)] bg-[color:var(--color-paper-3)] p-3 shadow-[var(--shadow-card)] md:p-4"
            style={{ borderRadius: "var(--radius-card)" }}
          >
            <div
              className="flex min-h-[260px] flex-col gap-4 bg-[color:var(--color-paper-2)] p-4 md:min-h-[340px] md:flex-row md:gap-5 md:p-6"
              style={{ borderRadius: "calc(var(--radius-card) - 4px)" }}
            >
              <div
                className="w-full space-y-3 border border-[color:var(--color-rule)] bg-[color:var(--color-paper-2)] p-5 md:w-[46%]"
                style={{ borderRadius: "calc(var(--radius-card) - 2px)" }}
              >
                <div className="h-2.5 w-3/4 rounded-full bg-[color:var(--color-rule)]" />
                <div className="h-2.5 w-full rounded-full bg-[color:var(--color-paper-3)]" />
                <div className="h-2.5 w-5/6 rounded-full bg-[color:var(--color-paper-3)]" />
                <div className="h-2.5 w-2/3 rounded-full bg-[color:var(--color-paper-3)]" />
                <div className="mt-5 h-[4.5rem] w-full border border-dashed border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)]" style={{ borderRadius: "8px" }} />
              </div>

              <div className="flex w-full flex-col justify-end gap-3 md:w-[54%]">
                <div
                  className="max-w-[92%] self-end bg-[color:var(--color-accent)] px-4 py-3 text-left text-[13px] font-medium leading-relaxed text-[color:var(--color-accent-ink)] md:text-sm"
                  style={{ borderRadius: "16px 16px 4px 16px" }}
                >
                  Analyze the termination clause and highlight risks.
                </div>
                <div
                  className="flex max-w-[95%] items-start gap-2 self-start border border-[color:var(--color-rule)] bg-[color:var(--color-paper-2)] px-4 py-3 text-left text-[13px] shadow-[var(--shadow-card)] md:text-sm"
                  style={{ borderRadius: "16px 16px 16px 4px" }}
                >
                  <Icon
                    name="smart_toy"
                    className="mt-0.5 shrink-0 text-[color:var(--color-accent)]"
                    filled
                  />
                  <p className="text-[color:var(--color-ink-2)]">
                    The termination clause in Section 4.2 allows for immediate
                    termination in cases of material breach{" "}
                    <span className="font-semibold text-[color:var(--color-accent)]">
                      [1]
                    </span>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
