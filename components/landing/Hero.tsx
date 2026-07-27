"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import {
  ChartDocIcon3D,
  CodeBlockIcon3D,
  DocFileIcon3D,
  DocsStackIcon3D,
  MagnifierIcon3D,
  PdfFileIcon3D,
  SparkleIcon3D,
  SpinnerIcon3D,
} from "@/components/landing/HeroIcons";

const ease = [0.32, 0.72, 0, 1] as const;

/**
 * Icon scale from the reference mock:
 * - XL anchors (PDF / DOC): ~148–172px
 * - MD tools (stack / magnifier / chart): ~72–96px
 * - SM accents (code / spinner): ~44–52px
 * - XS sparkles: ~22–28px
 */
function Floater({
  children,
  className,
  delay = 0,
  y = 8,
  rotate = 0,
  blur = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  rotate?: number;
  blur?: boolean;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      aria-hidden
      className={`pointer-events-none absolute z-[2] hidden md:block ${blur ? "opacity-80 blur-[0.6px]" : ""} ${className ?? ""}`}
      style={{ rotate }}
      animate={reduce ? undefined : { y: [0, -y, 0] }}
      transition={
        reduce
          ? undefined
          : {
              duration: 5.4 + delay * 0.4,
              delay,
              repeat: Infinity,
              ease: "easeInOut",
            }
      }
    >
      {children}
    </motion.div>
  );
}

export default function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden px-4 pb-12 pt-28 sm:px-6 md:pb-20 md:pt-32">
      {/* Soft lavender / sky atmosphere — hero only */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 48% 42% at 10% 18%, rgba(167,199,255,0.55) 0%, transparent 68%),
            radial-gradient(ellipse 46% 40% at 92% 16%, rgba(196,181,253,0.28) 0%, transparent 65%),
            radial-gradient(ellipse 40% 36% at 14% 78%, rgba(191,219,254,0.42) 0%, transparent 70%),
            radial-gradient(ellipse 38% 34% at 88% 82%, rgba(219,234,254,0.5) 0%, transparent 70%),
            linear-gradient(180deg, #f4f7ff 0%, #fafbff 48%, #ffffff 100%)
          `,
        }}
      />

      {/* ========== Desktop icon field — exact hierarchy ========== */}
      {/* Top-left cluster */}
      <Floater
        className="left-[5%] top-[12%] w-[84px] lg:left-[8%] lg:top-[13%] lg:w-[96px]"
        delay={0.1}
        y={9}
        rotate={-14}
      >
        <DocsStackIcon3D className="h-auto w-full" />
      </Floater>
      <Floater
        className="left-[14%] top-[9%] w-[48px] lg:left-[17%] lg:w-[52px]"
        delay={0.35}
        y={7}
        rotate={8}
      >
        <CodeBlockIcon3D className="h-auto w-full" />
      </Floater>
      <Floater
        className="left-[11%] top-[26%] w-[24px] lg:left-[13%] lg:w-[26px]"
        delay={0.7}
        y={5}
        rotate={12}
      >
        <SparkleIcon3D className="h-auto w-full" />
      </Floater>

      {/* Mid-left magnifier + sparkle */}
      <Floater
        className="left-[3%] top-[38%] w-[88px] lg:left-[5.5%] lg:top-[40%] lg:w-[100px]"
        delay={0.2}
        y={10}
        rotate={-28}
      >
        <MagnifierIcon3D className="h-auto w-full" />
      </Floater>
      <Floater
        className="left-[10%] top-[52%] w-[22px] lg:left-[12%] lg:w-[24px]"
        delay={0.9}
        y={6}
      >
        <SparkleIcon3D className="h-auto w-full" />
      </Floater>

      {/* Bottom-left XL PDF (hero anchor) */}
      <Floater
        className="bottom-[10%] left-[3%] z-[3] w-[148px] lg:bottom-[12%] lg:left-[6%] lg:w-[172px]"
        delay={0.4}
        y={11}
        rotate={16}
      >
        <PdfFileIcon3D className="h-auto w-full" />
      </Floater>
      <Floater
        className="bottom-[30%] left-[14%] w-[26px] lg:bottom-[32%] lg:left-[17%] lg:w-[28px]"
        delay={1.0}
        y={5}
        rotate={-8}
      >
        <SparkleIcon3D className="h-auto w-full" />
      </Floater>

      {/* Top-right cluster */}
      <Floater
        className="right-[12%] top-[10%] w-[92px] lg:right-[14%] lg:w-[104px]"
        delay={0.25}
        y={9}
        rotate={22}
        blur
      >
        <MagnifierIcon3D className="h-auto w-full" />
      </Floater>
      <Floater
        className="right-[2%] top-[8%] w-[80px] lg:right-[4%] lg:w-[92px]"
        delay={0.15}
        y={8}
        rotate={10}
        blur
      >
        <DocsStackIcon3D className="h-auto w-full" />
      </Floater>
      <Floater
        className="right-[10%] top-[26%] w-[24px] lg:right-[12%] lg:w-[26px]"
        delay={0.8}
        y={5}
      >
        <SparkleIcon3D className="h-auto w-full" />
      </Floater>

      {/* Mid-right chart doc */}
      <Floater
        className="right-[3%] top-[34%] w-[78px] lg:right-[5%] lg:top-[36%] lg:w-[88px]"
        delay={0.45}
        y={9}
        rotate={-8}
      >
        <ChartDocIcon3D className="h-auto w-full" />
      </Floater>

      {/* Lower-right XL DOC overlapping preview */}
      <Floater
        className="bottom-[18%] right-[2%] z-[4] w-[140px] lg:bottom-[20%] lg:right-[4%] lg:w-[164px]"
        delay={0.5}
        y={12}
        rotate={-14}
      >
        <DocFileIcon3D className="h-auto w-full" />
      </Floater>
      <Floater
        className="bottom-[14%] right-[16%] w-[22px] lg:bottom-[16%] lg:right-[18%] lg:w-[24px]"
        delay={1.1}
        y={5}
      >
        <SparkleIcon3D className="h-auto w-full" />
      </Floater>
      <Floater
        className="bottom-[34%] right-[18%] w-[44px] lg:bottom-[36%] lg:right-[20%] lg:w-[50px]"
        delay={0.65}
        y={7}
        rotate={18}
      >
        <SpinnerIcon3D className="h-auto w-full" />
      </Floater>

      {/* ========== Center content ========== */}
      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-6.5rem)] w-full max-w-[720px] flex-col items-center justify-center gap-6 text-center md:gap-7">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="inline-flex items-center gap-2 rounded-full bg-[#E8EEFF]/90 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1D4ED8] shadow-sm backdrop-blur-sm"
        >
          <Icon name="auto_awesome" className="text-[14px] text-[#2563EB]" filled />
          Next-gen RAG intelligence
        </motion.div>

        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.04, ease }}
          className="text-[2.35rem] font-bold tracking-[-0.035em] text-[#0F172A] sm:text-5xl md:text-[3.65rem] md:leading-[1.06]"
        >
          Upload any document.
          <br />
          <span className="text-[#1D4ED8]">Ask anything.</span>
          <br />
          Get answers instantly.
        </motion.h1>

        <motion.p
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease }}
          className="mx-auto max-w-[34rem] text-[15px] leading-relaxed text-[#64748B] md:text-lg"
        >
          Harness the power of AI to extract insights from PDFs, spreadsheets,
          and legal papers in seconds. Reliable intelligence built for
          professional precision.
        </motion.p>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.16, ease }}
          className="flex w-full flex-col items-center justify-center gap-3 sm:flex-row sm:gap-3.5"
        >
          <Link
            href="/auth/login"
            className="inline-flex w-full cursor-pointer items-center justify-center rounded-full bg-[#1D4ED8] px-8 py-3.5 text-[15px] font-bold text-white shadow-[0_12px_28px_rgba(29,78,216,0.3)] transition-colors duration-200 hover:bg-[#1E40AF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] active:scale-[0.98] sm:w-auto"
          >
            Get Started Free
          </Link>
          <a
            href="#how"
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-[#CBD5E1] bg-white px-8 py-3.5 text-[15px] font-bold text-[#0F172A] shadow-sm transition-colors duration-200 hover:bg-[#F8FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#94A3B8] active:scale-[0.98] sm:w-auto"
          >
            <Icon name="play_circle" className="text-[20px] text-[#1D4ED8]" />
            Watch Demo
          </a>
        </motion.div>

        {/* Mobile: key icons only, correct relative scale */}
        <div className="flex items-end justify-center gap-2 pt-1 md:hidden">
          <PdfFileIcon3D className="h-[4.5rem] w-[4.5rem] -rotate-6" />
          <MagnifierIcon3D className="mb-1 h-12 w-12 rotate-12" />
          <DocFileIcon3D className="h-[4.5rem] w-[4.5rem] rotate-6" />
          <ChartDocIcon3D className="mb-2 h-11 w-11 -rotate-3" />
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.22, ease }}
          className="relative mt-2 w-full max-w-[680px] md:mt-6"
        >
          <div className="overflow-hidden rounded-[1.5rem] border border-[#E2E8F0] bg-[#EEF2F7]/80 p-3 shadow-[0_28px_70px_-32px_rgba(15,23,42,0.28)] backdrop-blur-sm md:p-4">
            <div className="flex min-h-[240px] flex-col gap-4 rounded-[1.1rem] bg-gradient-to-br from-white via-[#FAFBFF] to-[#F1F5F9] p-4 md:min-h-[300px] md:flex-row md:gap-5 md:p-6">
              <div className="w-full space-y-3 rounded-xl border border-[#E2E8F0] bg-white p-5 md:w-[46%]">
                <div className="h-2.5 w-3/4 rounded-full bg-[#E2E8F0]" />
                <div className="h-2.5 w-full rounded-full bg-[#F1F5F9]" />
                <div className="h-2.5 w-5/6 rounded-full bg-[#F1F5F9]" />
                <div className="h-2.5 w-2/3 rounded-full bg-[#F1F5F9]" />
                <div className="mt-5 h-[4.5rem] w-full rounded-lg border border-dashed border-[#93C5FD] bg-[#EFF6FF]" />
              </div>

              <div className="flex w-full flex-col justify-end gap-3 md:w-[54%]">
                <div className="max-w-[92%] self-end rounded-2xl rounded-tr-md bg-[#1D4ED8] px-4 py-3 text-left text-[13px] font-medium leading-relaxed text-white shadow-md md:text-sm">
                  Analyze the termination clause and highlight risks.
                </div>
                <div className="flex max-w-[95%] items-start gap-2 self-start rounded-2xl rounded-tl-md border border-[#E2E8F0] bg-white px-4 py-3 text-left text-[13px] shadow-sm md:text-sm">
                  <Icon
                    name="smart_toy"
                    className="mt-0.5 shrink-0 text-[#1D4ED8]"
                    filled
                  />
                  <p className="text-[#334155]">
                    The termination clause in Section 4.2 allows for immediate
                    termination in cases of material breach{" "}
                    <span className="font-semibold text-[#1D4ED8]">[1]</span>.
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
