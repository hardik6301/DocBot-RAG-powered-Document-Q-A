"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Icon from "@/components/ui/Icon";

const features = [
  "Unlimited documents",
  "PDF, PPT, and DOC upload",
  "RAG answers with source citations",
  "Multi-document Q&A",
  "Chat history + PDF export",
  "Analytics",
];

export default function Pricing() {
  return (
    <section id="pricing" className="bg-surface-container-low px-gutter py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <h2 className="mb-2 text-headline-lg text-on-surface md:text-3xl md:font-semibold">
            Free while we ship
          </h2>
          <p className="text-body-md text-on-surface-variant">
            Full DocBot access for everyone right now. Paid plans later — after
            the product is solid.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
          className="mx-auto flex max-w-lg flex-col rounded-3xl border-2 border-primary bg-white p-10 shadow-lift"
        >
          <div className="mb-8">
            <h3 className="mb-2 text-headline-lg text-on-surface">Free</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-on-surface">$0</span>
              <span className="text-on-surface-variant">for now</span>
            </div>
            <p className="mt-4 text-body-sm text-on-surface-variant">
              Upload documents, ask questions, export chats — no card required.
            </p>
          </div>
          <ul className="mb-10 flex-grow space-y-4">
            {features.map((f) => (
              <li
                key={f}
                className="flex items-center gap-3 text-body-md text-on-surface"
              >
                <Icon
                  name="check_circle"
                  className="text-xl text-primary"
                  filled
                />
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/dashboard"
            className="block w-full rounded-xl bg-primary py-4 text-center font-bold text-on-primary shadow-lg transition-all hover:opacity-90 active:scale-95"
          >
            Start free
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
