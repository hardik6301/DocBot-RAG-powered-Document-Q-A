import Link from "next/link";

const links = [
  { label: "Privacy Policy", href: "#" },
  { label: "Terms of Service", href: "#" },
  { label: "API Docs", href: "#" },
  { label: "Support", href: "#" },
];

export default function Footer() {
  return (
    <footer className="w-full border-t border-[color:var(--color-rule)] bg-[color:var(--color-paper)] px-6 py-10 md:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <span className="font-display text-xl font-bold text-[color:var(--color-focus)]">
            DocBot
          </span>
          <p className="text-sm text-[color:var(--color-ink-2)]">
            © {new Date().getFullYear()} DocBot AI Intelligence. All rights
            reserved.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm text-[color:var(--color-ink-2)] underline decoration-transparent transition-colors duration-200 hover:text-[color:var(--color-focus)] hover:decoration-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus)]"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
