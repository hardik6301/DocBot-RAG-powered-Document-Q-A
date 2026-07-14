import Link from "next/link";

export default function Footer() {
  return (
    <footer className="flex w-full flex-col items-center justify-between gap-6 border-t border-outline-variant bg-surface px-container-padding py-stack-lg md:flex-row">
      <div className="flex flex-col items-center md:items-start">
        <span className="mb-2 text-headline-lg font-bold text-primary">
          DocBot
        </span>
        <p className="text-body-sm text-on-secondary-container">
          © {new Date().getFullYear()} DocBot AI Intelligence. All rights
          reserved.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-8">
        {["Privacy Policy", "Terms of Service", "API Docs", "Support"].map(
          (label) => (
            <Link
              key={label}
              href="#"
              className="text-body-sm text-on-secondary-container underline transition-colors hover:text-primary"
            >
              {label}
            </Link>
          ),
        )}
      </div>
    </footer>
  );
}
