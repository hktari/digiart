import { BookOpen } from "lucide-react";
import Link from "next/link";

const footerLinks = {
  Platform: [
    { href: "/browse/creators", label: "Browse Creators" },
    { href: "/browse/releases", label: "Browse Releases" },
    { href: "/auth/sign-up", label: "Get Started" },
  ],
  Account: [
    { href: "/auth/sign-in", label: "Sign in" },
    { href: "/account", label: "My Account" },
    { href: "/account/roles", label: "Manage Roles" },
  ],
  Legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-ink text-paper mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-serif font-bold text-xl text-paper hover:text-ocean-300 transition-colors"
            >
              <BookOpen className="w-5 h-5 text-ocean-400" strokeWidth={1.5} />
              Booklet Drops
            </Link>
            <p className="mt-4 text-sm text-paper/60 leading-relaxed max-w-xs">
              Connecting digital artists with collectors through monthly printed
              booklet subscriptions.
            </p>
          </div>

          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-paper/40 mb-4">
                {section}
              </h3>
              <ul className="flex flex-col gap-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-paper/70 hover:text-paper transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-paper/10 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-paper/40">
          <p>
            &copy; {new Date().getFullYear()} Booklet Drops. All rights
            reserved.
          </p>
          <p>
            Built by{" "}
            <a
              href="https://www.bostjankamnik.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-vermilion hover:text-vermilion/80 transition-colors"
            >
              bo | ka
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
