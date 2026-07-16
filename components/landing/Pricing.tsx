"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import UpgradeButton from "@/components/billing/UpgradeButton";

const freeFeatures = [
  "3 Documents per month",
  "20MB Max file size",
  "Standard RAG engine",
];

const proFeatures = [
  "Unlimited Documents",
  "500MB Max file size",
  "Priority AI processing",
  "API Access & Batch Processing",
  "Dedicated Support",
];

export default function Pricing() {
  return (
    <section id="pricing" className="bg-surface-container-low px-gutter py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <h2 className="mb-2 text-headline-lg text-on-surface md:text-3xl md:font-semibold">
            Simple, Transparent Pricing
          </h2>
          <p className="text-body-md text-on-surface-variant">
            Choose the plan that fits your analysis needs.
          </p>
        </div>

        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
            className="flex flex-col rounded-3xl border border-outline-variant bg-surface p-10 shadow-sm transition-shadow hover:shadow-soft"
          >
            <div className="mb-8">
              <h3 className="mb-2 text-headline-lg text-on-surface">Free</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-on-surface">$0</span>
                <span className="text-on-surface-variant">/mo</span>
              </div>
              <p className="mt-4 text-body-sm text-on-surface-variant">
                Perfect for individuals and small research projects.
              </p>
            </div>
            <ul className="mb-10 flex-grow space-y-4">
              {freeFeatures.map((f) => (
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
              <li className="flex items-center gap-3 text-body-md text-on-surface-variant opacity-50">
                <Icon name="block" className="text-xl text-outline" />
                API Access
              </li>
            </ul>
            <Link
              href="/auth/login"
              className="block w-full rounded-xl border-2 border-primary py-4 text-center font-bold text-primary transition-colors hover:bg-primary-fixed"
            >
              Current Plan
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08, duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
            className="group relative flex flex-col overflow-hidden rounded-3xl border-2 border-primary bg-white p-10 shadow-lift"
          >
            <div className="absolute right-0 top-0 rounded-bl-xl bg-primary px-6 py-1 font-mono text-[10px] text-on-primary">
              MOST POPULAR
            </div>
            <div className="mb-8">
              <h3 className="mb-2 text-headline-lg text-on-surface">Pro</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-on-surface">$29</span>
                <span className="text-on-surface-variant">/mo</span>
              </div>
              <p className="mt-4 text-body-sm text-on-surface-variant">
                Advanced tools for professionals requiring deep analysis.
              </p>
            </div>
            <ul className="mb-10 flex-grow space-y-4">
              {proFeatures.map((f) => (
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
            <UpgradeButton
              className="block w-full rounded-xl bg-primary py-4 text-center font-bold text-on-primary shadow-lg transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
              onUnavailable={() => {
                window.location.href = "/dashboard";
              }}
            >
              Upgrade Now
            </UpgradeButton>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
