"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Icon from "@/components/ui/Icon";

const ease = [0.32, 0.72, 0, 1] as const;

export default function Hero() {
  return (
    <section className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-gutter pb-20 pt-28">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, #dbe1ff 0%, transparent 60%), radial-gradient(ellipse 40% 40% at 90% 20%, #eaedff 0%, transparent 50%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-5xl space-y-stack-lg text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="mb-2 inline-flex items-center gap-2 rounded-full bg-secondary-fixed px-3 py-1 font-mono text-label-caps text-on-secondary-fixed"
        >
          <Icon name="auto_awesome" className="text-[14px]" filled />
          NEXT-GEN RAG INTELLIGENCE
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05, ease }}
          className="text-4xl font-bold tracking-tight text-on-background md:text-6xl md:leading-[1.1]"
        >
          Upload any document. <br />
          <span className="text-primary">Ask anything.</span> <br />
          Get answers instantly.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.12, ease }}
          className="mx-auto max-w-2xl text-body-md leading-relaxed text-on-surface-variant"
        >
          Harness the power of AI to extract insights from PDFs, spreadsheets,
          and legal papers in seconds. Reliable intelligence built for
          professional precision.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.18, ease }}
          className="flex flex-col items-center justify-center gap-4 pt-2 sm:flex-row"
        >
          <Link
            href="/auth/login"
            className="w-full rounded-xl bg-primary px-10 py-4 text-lg font-bold text-on-primary transition-all hover:shadow-lift active:scale-95 sm:w-auto"
          >
            Get Started Free
          </Link>
          <a
            href="#how"
            className="glass-card flex w-full items-center justify-center gap-2 rounded-xl px-10 py-4 text-lg font-bold text-on-surface transition-all hover:bg-surface-container sm:w-auto"
          >
            <Icon name="play_circle" />
            Watch Demo
          </a>
        </motion.div>

        {/* Product preview mock — pure CSS, no external images */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.28, ease }}
          className="relative mx-auto mt-10 h-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-outline-variant bg-surface shadow-lift"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-surface to-surface-container-low" />
          <div className="relative flex h-full min-h-[340px] flex-col gap-6 p-6 md:min-h-[400px] md:flex-row md:gap-8 md:p-8">
            <div className="w-full space-y-3 rounded-lg border border-outline-variant bg-white p-6 shadow-sm md:w-1/2">
              <div className="h-3 w-3/4 animate-pulse rounded bg-surface-container" />
              <div className="h-3 w-full rounded bg-surface-container-low" />
              <div className="h-3 w-5/6 rounded bg-surface-container-low" />
              <div className="h-3 w-2/3 rounded bg-surface-container-low" />
              <div className="mt-4 h-20 w-full rounded-lg border border-dashed border-primary bg-primary-fixed/30" />
            </div>

            <div className="flex w-full flex-col justify-end space-y-4 md:w-1/2">
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55, duration: 0.5, ease }}
                className="max-w-[85%] self-end rounded-xl rounded-tr-none bg-primary p-4 text-sm text-on-primary shadow-md"
              >
                Analyze the termination clause and highlight risks.
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.75, duration: 0.5, ease }}
                className="flex max-w-[90%] items-start gap-3 self-start rounded-xl rounded-tl-none border border-outline-variant bg-white p-4 text-sm shadow-sm"
              >
                <Icon
                  name="smart_toy"
                  className="shrink-0 text-primary"
                  filled
                />
                <div className="text-left">
                  <p className="text-on-surface">
                    The termination clause in Section 4.2 allows for immediate
                    termination in cases of material breach{" "}
                    <span className="font-mono text-primary">[1]</span>.
                  </p>
                  <span className="mt-2 inline-block rounded bg-secondary-fixed px-2 py-1 font-mono text-[10px] text-on-secondary-fixed">
                    SOURCE [1]
                  </span>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
